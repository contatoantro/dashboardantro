// src/app/api/gdrive/sync/route.ts
//
// POST /api/gdrive/sync
// Executa o sync completo: lista CSVs da pasta configurada, filtra os novos
// (por md5 / nome ainda não importado), importa cada um e grava o log.
//
// GET /api/gdrive/sync
// Retorna status do último sync sem executar nada.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { listCsvFiles, downloadFileAsText, isDriveConfigured } from '@/lib/gdrive';
import { requireAuth } from '@/lib/require-auth';

// ─── Detecção de plataforma pelo nome do arquivo ──────────────────────────────
// Convenção: o nome do CSV deve conter o nome da plataforma.
// Ex: "instagram_jan2026_sam.csv" → instagram

const PLATFORM_KEYWORDS: Record<string, Platform> = {
  instagram: 'instagram',
  tiktok:    'tiktok',
  youtube:   'youtube',
  twitter:   'twitter',
  facebook:  'facebook',
  fb:        'facebook',
  x_:        'twitter',
  '_x.':     'twitter',
};

function detectPlatform(filename: string): Platform | null {
  const lower = filename.toLowerCase();
  for (const [kw, plt] of Object.entries(PLATFORM_KEYWORDS)) {
    if (lower.includes(kw)) return plt;
  }
  return null;
}

// ─── Re-usa os parsers do import/route.ts inline ─────────────────────────────
// (duplicação intencional para manter a rota autônoma sem import circular)

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines   = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  const sep = text.includes('\t') ? '\t' : ',';

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === sep && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitLine(nonEmpty[0]);
  const rows = nonEmpty.slice(1).map(line => {
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });

  return { headers, rows };
}

function col(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase().trim());
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return '';
}

function num(v: string): bigint { return BigInt(v.replace(/[^\d]/g, '') || '0'); }
function flt(v: string): number { return parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0; }

function parseDate(v: string): Date | null {
  if (!v) return null;
  const dm = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dm) return new Date(+dm[3], +dm[2] - 1, +dm[1]);
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function calcER(likes: bigint, comments: bigint, shares: bigint, base: bigint): number {
  const i = Number(likes) + Number(comments) + Number(shares);
  const b = Number(base);
  return b === 0 ? 0 : Math.round((i / b) * 10000) / 100;
}

// ─── Importação de um único arquivo ──────────────────────────────────────────

async function importFile(
  brandId:  string,
  platform: Platform,
  filename: string,
  text:     string,
): Promise<{ rowsOk: number; rowsSkip: number }> {

  const { rows } = parseCsvText(text);
  if (rows.length === 0) return { rowsOk: 0, rowsSkip: 0 };

  let rowsOk = 0;
  let rowsSkip = 0;

  // ── Posts individuais (Instagram, YouTube, Facebook) ─────────────────────
  if (platform === 'instagram' || platform === 'youtube' || platform === 'facebook') {
    for (const row of rows) {
      try {
        const dateRaw = col(row, 'Horário de publicação', 'Post time', 'Data de publicação', 'Published', 'Data', 'Date', 'Publish date');
        const date    = parseDate(dateRaw);
        if (!date) { rowsSkip++; continue; }

        const reach    = num(col(row, 'Alcance', 'Reach', 'Post reach'));
        const likes    = num(col(row, 'Curtidas', 'Likes', 'Reações', 'Reactions'));
        const comments = num(col(row, 'Comentários', 'Comments'));
        const shares   = num(col(row, 'Compartilhamentos', 'Shares'));
        const saves    = num(col(row, 'Salvamentos', 'Saves'));
        const impr     = num(col(row, 'Impressões', 'Impressions'));
        const views    = platform === 'youtube'
          ? num(col(row, 'Visualizações', 'Views'))
          : impr;
        const url      = col(row, 'URL', 'Link', 'Permalink', 'URL da publicação', 'URL do vídeo', 'Video URL');
        const postType = col(row, 'Tipo de publicação', 'Post type', 'Media type', 'Tipo de postagem', 'Post type');
        const title    = col(row, 'Título do vídeo', 'Video title', 'Content');
        const watchTimeSec = platform === 'youtube'
          ? BigInt(Math.round(flt(col(row, 'Tempo de exibição (horas)', 'Watch time (hours)', 'Watch time')) * 3600))
          : BigInt(0);
        const er       = calcER(likes, comments, shares, reach > BigInt(0) ? reach : BigInt(1));
        const extId    = url || col(row, 'Post ID', 'ID da publicação') || `${platform}_${dateRaw}_${Number(likes)}`;

        await prisma.post.upsert({
          where:  { brandId_platform_externalId: { brandId, platform, externalId: extId } },
          update: { views, likes, comments, shares, reach, saves, impressions: impr, er, postType: postType || undefined, title: title || undefined, url: url || undefined, watchTimeSec },
          create: { brandId, platform, externalId: extId, date, views, likes, comments, shares, reach, saves, impressions: impr, er, postType: postType || undefined, title: title || undefined, url: url || undefined, watchTimeSec },
        });
        rowsOk++;
      } catch { rowsSkip++; }
    }
  }

  // ── Métricas diárias (TikTok, Twitter) ───────────────────────────────────
  if (platform === 'tiktok' || platform === 'twitter') {
    for (const row of rows) {
      try {
        const dateRaw = col(row, 'Data', 'Date', 'Tweet date');
        const date    = parseDate(dateRaw);
        if (!date) { rowsSkip++; continue; }

        const views    = num(col(row, 'Visualizações de vídeo', 'Video views', 'Views', 'Impressions', 'Impressões'));
        const likes    = num(col(row, 'Curtidas', 'Likes'));
        const comments = num(col(row, 'Comentários', 'Comments', 'Replies'));
        const shares   = num(col(row, 'Compartilhamentos', 'Shares', 'Retweets'));
        const reach    = num(col(row, 'Alcance', 'Reach', 'Unique viewers'));
        const impr     = views;
        const er       = calcER(likes, comments, shares, views > BigInt(0) ? views : BigInt(1));

        await prisma.dailyMetric.upsert({
          where:  { brandId_platform_date: { brandId, platform, date } },
          update: { views, likes, comments, shares, reach, impressions: impr, er },
          create: { brandId, platform, date, views, likes, comments, shares, reach, impressions: impr, er },
        });
        rowsOk++;
      } catch { rowsSkip++; }
    }
  }

  return { rowsOk, rowsSkip };
}

// ─── GET — status do último sync ──────────────────────────────────────────────

export async function GET() {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;

    const folderSetting = await prisma.setting.findUnique({ where: { key: 'gdrive_folder' } });
    const folderId = folderSetting?.value ?? '';

    const lastSync = await prisma.setting.findUnique({ where: { key: 'gdrive_last_sync' } });
    const lastSyncFiles = await prisma.setting.findUnique({ where: { key: 'gdrive_last_sync_files' } });

    const configured = isDriveConfigured();
    return NextResponse.json({
      ok: true,
      configured,
      folderId,
      lastSync:      lastSync?.value ?? null,
      lastSyncFiles: lastSyncFiles?.value ? parseInt(lastSyncFiles.value) : 0,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── POST — executa sync ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;

    if (!isDriveConfigured()) {
      return NextResponse.json({
        error: 'Google Drive não configurado. Adicione GOOGLE_SERVICE_ACCOUNT_JSON no .env.local',
      }, { status: 400 });
    }

    // Lê brandId do body (obrigatório — cada sync é por brand)
    const body     = await req.json().catch(() => ({}));
    const brandId  = body.brandId as string | undefined;
    const force    = body.force === true; // força reimport mesmo de arquivos já importados

    if (!brandId) {
      return NextResponse.json({ error: 'brandId obrigatório no body' }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: 'Brand não encontrada' }, { status: 404 });
    }

    const folderSetting = await prisma.setting.findUnique({ where: { key: 'gdrive_folder' } });
    const folderId = folderSetting?.value?.trim();
    if (!folderId) {
      return NextResponse.json({ error: 'gdrive_folder não configurado em Configurações' }, { status: 400 });
    }

    // Lista arquivos da pasta
    const files = await listCsvFiles(folderId);

    if (files.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhum CSV encontrado na pasta', imported: 0, skipped: 0 });
    }

    // Busca checksums já importados (evita reimport)
    const existingLogs = await prisma.importLog.findMany({
      where:  { brandId },
      select: { filename: true },
    });
    const importedNames = new Set(existingLogs.map(l => l.filename));

    let totalImported = 0;
    let totalSkipped  = 0;
    const results: Array<{ file: string; platform: string; rowsOk: number; rowsSkip: number; status: string }> = [];

    for (const file of files) {
      // Pula arquivos já importados (a menos que force=true)
      const alreadyImported = importedNames.has(file.name);
      if (alreadyImported && !force) {
        totalSkipped++;
        results.push({ file: file.name, platform: '—', rowsOk: 0, rowsSkip: 0, status: 'skipped' });
        continue;
      }

      // Detecta plataforma pelo nome
      const platform = detectPlatform(file.name);
      if (!platform) {
        totalSkipped++;
        results.push({ file: file.name, platform: '?', rowsOk: 0, rowsSkip: 0, status: 'no_platform' });
        continue;
      }

      try {
        const text = await downloadFileAsText(file.id);
        const { rowsOk, rowsSkip } = await importFile(brandId, platform, file.name, text);

        await prisma.importLog.create({
          data: {
            brandId,
            platform,
            filename:  file.name,
            rowsTotal: rowsOk + rowsSkip,
            rowsOk,
            rowsSkip,
            status: rowsSkip > rowsOk ? 'PARTIAL' : 'OK',
          },
        });

        totalImported++;
        results.push({ file: file.name, platform, rowsOk, rowsSkip, status: 'ok' });
      } catch (err) {
        totalSkipped++;
        results.push({ file: file.name, platform, rowsOk: 0, rowsSkip: 0, status: `error: ${String(err)}` });
      }
    }

    // Salva timestamp e contagem do último sync
    const now = new Date().toISOString();
    await prisma.setting.upsert({ where: { key: 'gdrive_last_sync' },       update: { value: now },                   create: { key: 'gdrive_last_sync',       value: now } });
    await prisma.setting.upsert({ where: { key: 'gdrive_last_sync_files' }, update: { value: String(totalImported) }, create: { key: 'gdrive_last_sync_files', value: String(totalImported) } });

    return NextResponse.json({
      ok: true,
      filesFound:   files.length,
      imported:     totalImported,
      skipped:      totalSkipped,
      syncedAt:     now,
      results,
    });

  } catch (err) {
    console.error('[gdrive/sync]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
