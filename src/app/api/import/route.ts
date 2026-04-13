import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { requireAuth } from '@/lib/require-auth';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ParsedRow {
  externalId?: string;
  date: Date;
  publishedAt?: Date;
  views: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  reach: bigint;
  saves: bigint;
  impressions: bigint;
  er: number;
  postType?: string;
  title?: string;
  url?: string;
  watchTimeSec: bigint;
  rawExtra?: Record<string, string>;
}

interface DailyRow {
  date: Date;
  views: bigint;
  reach: bigint;
  impressions: bigint;
  likes: bigint;
  comments: bigint;
  shares: bigint;
  er: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Remove BOM
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  const sep = clean.includes('\t') ? '\t' : ',';

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
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
    const found = Object.keys(row).find(
      rk => rk.toLowerCase().trim() === k.toLowerCase().trim()
    );
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return '';
}

function num(value: string): bigint {
  const clean = value.replace(/[^\d-]/g, '');
  if (!clean || clean === '-') return BigInt(0);
  return BigInt(clean);
}

function float(value: string): number {
  const clean = value.replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(clean || '0') || 0;
}

// DD/MM/YYYY or MM/DD/YYYY (sem hora)
function parseDateSlash(value: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const a = parseInt(m[1]);
  const b = parseInt(m[2]);
  const year = parseInt(m[3]);
  // Instagram/Facebook exporta MM/DD/YYYY
  const [month, day] = a > 12 ? [b, a] : [a, b];
  return new Date(year, month - 1, day);
}

// MM/DD/YYYY HH:MM (Instagram/Facebook "Horário de publicação")
function parseDatetimeSlash(value: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const a = parseInt(m[1]);
  const b = parseInt(m[2]);
  const year = parseInt(m[3]);
  const hour = parseInt(m[4]);
  const min = parseInt(m[5]);
  const [month, day] = a > 12 ? [b, a] : [a, b];
  return new Date(year, month - 1, day, hour, min);
}

// "Jan 15, 2026" (YouTube)
function parseDateEnMonth(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  return null;
}

// "Sat, Jan 31, 2026" (Twitter) ou qualquer formato en-US
function parseDateEN(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  return parseDateSlash(value);
}

// "1 de janeiro" → Date (TikTok, sem ano — assume ano corrente ou inferido)
function parseDatePtBRMonth(value: string, inferYear?: number): Date | null {
  if (!value) return null;
  const meses: Record<string, number> = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7, 'setembro': 8,
    'outubro': 9, 'novembro': 10, 'dezembro': 11,
  };
  const m = value.match(/^(\d{1,2})\s+de\s+(\w+)/i);
  if (!m) return null;
  const day = parseInt(m[1]);
  const monthName = m[2].toLowerCase();
  const monthIdx = meses[monthName];
  if (monthIdx === undefined) return null;
  const year = inferYear ?? new Date().getFullYear();
  return new Date(year, monthIdx, day);
}

function calcER(likes: bigint, comments: bigint, shares: bigint, base: bigint): number {
  const interactions = Number(likes) + Number(comments) + Number(shares);
  const b = Number(base);
  if (b === 0) return 0;
  return Math.round((interactions / b) * 10000) / 100;
}

// ─── Parsers por plataforma ───────────────────────────────────────────────────

// Instagram CSV: "Identificação do post", "Nome da conta", "Horário de publicação" (MM/DD/YYYY HH:MM),
// "Link permanente", "Tipo de post", "Data" (="Total"), "Visualizações", "Alcance",
// "Curtidas", "Compartilhamentos", "Comentários", "Salvamentos"
function parseInstagram(rows: Record<string, string>[]): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (const row of rows) {
    const datetimeRaw = col(row, 'Horário de publicação');
    const publishedAt = parseDatetimeSlash(datetimeRaw);
    const date = publishedAt
      ? new Date(publishedAt.getFullYear(), publishedAt.getMonth(), publishedAt.getDate())
      : parseDateSlash(col(row, 'Data'));
    if (!date || isNaN(date.getTime())) continue;

    const reach       = num(col(row, 'Alcance'));
    const impressions = num(col(row, 'Visualizações'));
    const likes       = num(col(row, 'Curtidas'));
    const comments    = num(col(row, 'Comentários'));
    const shares      = num(col(row, 'Compartilhamentos'));
    const saves       = num(col(row, 'Salvamentos'));
    const postType    = col(row, 'Tipo de post');
    const url         = col(row, 'Link permanente');
    const postId      = col(row, 'Identificação do post');
    const er          = calcER(likes, comments, shares, reach > BigInt(0) ? reach : BigInt(1));
    const externalId  = postId || url || `ig_${datetimeRaw}_${Number(likes)}`;

    result.push({
      externalId, date, publishedAt: publishedAt ?? undefined,
      views: impressions, likes, comments, shares, reach, saves, impressions, er,
      postType: postType || undefined, url: url || undefined, watchTimeSec: BigInt(0),
    });
  }
  return result;
}

// TikTok CSV: "Date" ("1 de janeiro"), "Video Views", "Profile Views",
// "Likes", "Comments", "Shares"
function parseTikTokDaily(rows: Record<string, string>[]): DailyRow[] {
  const result: DailyRow[] = [];
  const year = new Date().getFullYear();
  for (const row of rows) {
    const dateRaw = col(row, 'Date', 'Data');
    const date = parseDatePtBRMonth(dateRaw, year) || parseDateSlash(dateRaw) || parseDateEN(dateRaw);
    if (!date || isNaN(date.getTime())) continue;
    const views    = num(col(row, 'Video Views', 'Visualizações de vídeo', 'Views'));
    const likes    = num(col(row, 'Likes', 'Curtidas'));
    const comments = num(col(row, 'Comments', 'Comentários'));
    const shares   = num(col(row, 'Shares', 'Compartilhamentos'));
    const er       = calcER(likes, comments, shares, views > BigInt(0) ? views : BigInt(1));
    result.push({ date, views, reach: BigInt(0), impressions: views, likes, comments, shares, er });
  }
  return result;
}

// YouTube CSV: "Conteúdo" (video ID), "Título do vídeo",
// "Horário de publicação do vídeo" ("Jan 15, 2026"),
// "Marcações "Gostei"", "Compartilhamentos", "Visualizações",
// "Tempo de exibição (horas)", "Impressões"
function parseYouTube(rows: Record<string, string>[]): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (const row of rows) {
    const title = col(row, 'Título do vídeo');
    const videoId = col(row, 'Conteúdo');
    if (!title || title.toLowerCase() === 'total' || title === '-') continue;
    if (!videoId || videoId.toLowerCase() === 'total') continue;

    const dateRaw = col(row, 'Horário de publicação do vídeo', 'Data de publicação');
    const date = parseDateEnMonth(dateRaw) || parseDateSlash(dateRaw);
    if (!date || isNaN(date.getTime())) continue;

    const views        = num(col(row, 'Visualizações', 'Views'));
    const likes        = num(col(row, 'Marcações "Gostei"', 'Marcações Gostei', 'Curtidas', 'Likes'));
    const shares       = num(col(row, 'Compartilhamentos', 'Shares'));
    const impressions  = num(col(row, 'Impressões', 'Impressions'));
    const watchTimeH   = float(col(row, 'Tempo de exibição (horas)', 'Watch time (hours)'));
    const watchTimeSec = BigInt(Math.round(watchTimeH * 3600));
    const url          = `https://youtube.com/watch?v=${videoId}`;
    const externalId   = videoId;
    const er           = calcER(likes, BigInt(0), shares, views > BigInt(0) ? views : BigInt(1));

    result.push({
      externalId, date, views, likes, comments: BigInt(0), shares,
      reach: BigInt(0), saves: BigInt(0), impressions, er,
      postType: 'Vídeo', title, url, watchTimeSec,
    });
  }
  return result;
}

// Twitter CSV: "Date" ("Sat, Jan 31, 2026"), "Impressões", "Curtidas",
// "Compartilhamentos", "Respostas", "Reposts"
function parseTwitterDaily(rows: Record<string, string>[]): DailyRow[] {
  const result: DailyRow[] = [];
  for (const row of rows) {
    const dateRaw = col(row, 'Date', 'Tweet date', 'Data');
    const date = parseDateEN(dateRaw);
    if (!date || isNaN(date.getTime())) continue;
    const impressions = num(col(row, 'Impressões', 'Impressions'));
    const likes       = num(col(row, 'Curtidas', 'Likes'));
    const shares      = num(col(row, 'Compartilhamentos', 'Shares', 'Reposts', 'Retweets'));
    const comments    = num(col(row, 'Respostas', 'Replies', 'Comments'));
    const er          = calcER(likes, comments, shares, impressions > BigInt(0) ? impressions : BigInt(1));
    result.push({ date, views: impressions, reach: BigInt(0), impressions, likes, comments, shares, er });
  }
  return result;
}

// Facebook CSV: "Identificação do post", "Nome da Página",
// "Horário de publicação" (MM/DD/YYYY HH:MM), "Link permanente",
// "Tipo de post", "Visualizações", "Alcance", "Reações", "Comentários",
// "Compartilhamentos"
function parseFacebook(rows: Record<string, string>[]): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (const row of rows) {
    const datetimeRaw = col(row, 'Horário de publicação');
    const publishedAt = parseDatetimeSlash(datetimeRaw);
    const date = publishedAt
      ? new Date(publishedAt.getFullYear(), publishedAt.getMonth(), publishedAt.getDate())
      : parseDateSlash(col(row, 'Data'));
    if (!date || isNaN(date.getTime())) continue;

    const postId     = col(row, 'Identificação do post', 'Post ID');
    const postType   = col(row, 'Tipo de post', 'Tipo de postagem');
    const reach      = num(col(row, 'Alcance', 'Reach'));
    const views      = num(col(row, 'Visualizações', 'Views'));
    const likes      = num(col(row, 'Reações', 'Reactions', 'Likes'));
    const comments   = num(col(row, 'Comentários', 'Comments'));
    const shares     = num(col(row, 'Compartilhamentos', 'Shares'));
    const url        = col(row, 'Link permanente', 'Permalink');
    const externalId = postId || url || `fb_${datetimeRaw}_${Number(likes)}`;
    const er         = calcER(likes, comments, shares, reach > BigInt(0) ? reach : BigInt(1));

    result.push({
      externalId, date, publishedAt: publishedAt ?? undefined,
      views, likes, comments, shares, reach, saves: BigInt(0),
      impressions: views, er,
      postType: postType || undefined, url: url || undefined, watchTimeSec: BigInt(0),
    });
  }
  return result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;
    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const brandId  = formData.get('brandId') as string | null;
    const platform = formData.get('platform') as string | null;

    if (!file || !brandId || !platform) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: file, brandId, platform' }, { status: 400 });
    }
    if (!Object.values(Platform).includes(platform as Platform)) {
      return NextResponse.json({ error: `Plataforma inválida: ${platform}` }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      return NextResponse.json({ error: `Brand não encontrada: ${brandId}` }, { status: 404 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Limite: 10 MB.' }, { status: 413 });
    }

    const text = await file.text();
    const { rows } = parseCsvText(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Arquivo vazio ou sem dados válidos.' }, { status: 400 });
    }

    const plt = platform as Platform;
    let rowsOk = 0;
    let rowsSkip = 0;
    let lastError = '';

    if (plt === 'instagram' || plt === 'youtube' || plt === 'facebook') {
      const parser = plt === 'instagram' ? parseInstagram
                   : plt === 'youtube'   ? parseYouTube
                   : parseFacebook;
      const parsed = parser(rows);
      rowsSkip = rows.length - parsed.length;
      console.log(`[import] ${plt}: ${rows.length} raw rows → ${parsed.length} parsed`);

      for (const p of parsed) {
        try {
          await prisma.post.upsert({
            where: {
              brandId_platform_externalId: {
                brandId,
                platform: plt,
                externalId: p.externalId ?? `__nokey_${Date.now()}_${Math.random()}`,
              },
            },
            update: {
              views: p.views, likes: p.likes, comments: p.comments,
              shares: p.shares, reach: p.reach, saves: p.saves,
              impressions: p.impressions, er: p.er,
              postType: p.postType, title: p.title, url: p.url,
              watchTimeSec: p.watchTimeSec,
              rawExtra: p.rawExtra ?? undefined,
              ...(p.publishedAt ? { publishedAt: p.publishedAt } : {}),
            },
            create: {
              brandId, platform: plt,
              externalId: p.externalId,
              date: p.date,
              views: p.views, likes: p.likes, comments: p.comments,
              shares: p.shares, reach: p.reach, saves: p.saves,
              impressions: p.impressions, er: p.er,
              postType: p.postType, title: p.title, url: p.url,
              watchTimeSec: p.watchTimeSec,
              rawExtra: p.rawExtra ?? undefined,
              ...(p.publishedAt ? { publishedAt: p.publishedAt } : {}),
            },
          });
          rowsOk++;
        } catch (e) {
          lastError = String(e);
          console.error(`[import] post upsert fail:`, e);
          rowsSkip++;
        }
      }
    }

    if (plt === 'tiktok' || plt === 'twitter') {
      const parser = plt === 'tiktok' ? parseTikTokDaily : parseTwitterDaily;
      const parsed = parser(rows);
      rowsSkip = rows.length - parsed.length;
      console.log(`[import] ${plt}: ${rows.length} raw rows → ${parsed.length} parsed`);

      for (const d of parsed) {
        try {
          await prisma.dailyMetric.upsert({
            where: { brandId_platform_date: { brandId, platform: plt, date: d.date } },
            update: { views: d.views, reach: d.reach, impressions: d.impressions, likes: d.likes, comments: d.comments, shares: d.shares, er: d.er },
            create: { brandId, platform: plt, date: d.date, views: d.views, reach: d.reach, impressions: d.impressions, likes: d.likes, comments: d.comments, shares: d.shares, er: d.er },
          });
          rowsOk++;
        } catch (e) {
          lastError = String(e);
          console.error(`[import] daily upsert fail:`, e);
          rowsSkip++;
        }
      }
    }

    await prisma.importLog.create({
      data: {
        brandId, platform: plt, filename: file.name,
        rowsTotal: rows.length, rowsOk, rowsSkip,
        status: rowsOk === 0 ? 'ERROR' : rowsSkip > 0 ? 'PARTIAL' : 'OK',
      },
    });

    return NextResponse.json({
      ok: true, platform: plt, filename: file.name,
      rowsTotal: rows.length, rowsOk, rowsSkip,
      ...(lastError && rowsOk === 0 ? { debug: lastError.slice(0, 200) } : {}),
    });

  } catch (err) {
    console.error('[import] erro:', err);
    return NextResponse.json({ error: 'Erro interno no servidor.', debug: String(err).slice(0, 200) }, { status: 500 });
  }
}
