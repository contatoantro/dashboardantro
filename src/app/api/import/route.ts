import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';
import { requireAuth } from '@/lib/require-auth';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ParsedRow {
  externalId?: string;
  date: Date;
  publishedAt?: Date; // Sprint 4: hora exata de publicação
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
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  const sep = text.includes('\t') ? '\t' : ',';

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
  const clean = value.replace(/[^\d]/g, '');
  return BigInt(clean || '0');
}

function float(value: string): number {
  const clean = value.replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(clean || '0') || 0;
}

function parseDatePtBR(value: string): Date | null {
  if (!value) return null;
  const dmY = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmY) return new Date(parseInt(dmY[3]), parseInt(dmY[2]) - 1, parseInt(dmY[1]));
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  return null;
}

// Sprint 4: parse de data+hora — ex: "31/01/2026 14:32" ou "01/31/2026 14:32"
function parseDatetimePtBR(value: string): Date | null {
  if (!value) return null;

  // Tenta DD/MM/YYYY HH:MM ou MM/DD/YYYY HH:MM
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const a = parseInt(match[1]);
    const b = parseInt(match[2]);
    const year  = parseInt(match[3]);
    const hour  = parseInt(match[4]);
    const min   = parseInt(match[5]);
    // Se primeiro campo > 12, é obrigatoriamente dia (DD/MM)
    // Se segundo campo > 12, é obrigatoriamente mês inválido → tenta MM/DD
    const [day, month] = a > 12 ? [a, b] : [a, b]; // Instagram exporta MM/DD/YYYY
    return new Date(year, month - 1, day, hour, min);
  }

  // Fallback: só data sem hora
  return parseDatePtBR(value);
}

function parseDateEN(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  return parseDatePtBR(value);
}

function calcER(likes: bigint, comments: bigint, shares: bigint, reach: bigint): number {
  const interactions = Number(likes) + Number(comments) + Number(shares);
  const base = Number(reach);
  if (base === 0) return 0;
  return Math.round((interactions / base) * 10000) / 100;
}

// ─── Parsers por plataforma ───────────────────────────────────────────────────

// Sprint 4: Instagram agora lê "Horário de publicação" (data+hora)
function parseInstagram(rows: Record<string, string>[]): ParsedRow[] {
  const result: ParsedRow[] = [];

  for (const row of rows) {
    const conta = col(row, 'Conta', 'Account');
    if (conta.toLowerCase() === 'total' || conta === '') continue;

    // Tenta coluna com hora primeiro; fallback para coluna só de data
    const datetimeRaw = col(row, 'Horário de publicação', 'Post time', 'Published time');
    const dateRaw     = col(row, 'Data', 'Date');

    const publishedAt = datetimeRaw ? parseDatetimePtBR(datetimeRaw) : null;
    const date = publishedAt
      ? new Date(publishedAt.getFullYear(), publishedAt.getMonth(), publishedAt.getDate())
      : parseDatePtBR(dateRaw);

    if (!date) continue;

    const reach       = num(col(row, 'Alcance', 'Reach'));
    const impressions = num(col(row, 'Impressões', 'Impressions'));
    const likes       = num(col(row, 'Curtidas', 'Likes'));
    const comments    = num(col(row, 'Comentários', 'Comments'));
    const shares      = num(col(row, 'Compartilhamentos', 'Shares'));
    const saves       = num(col(row, 'Salvamentos', 'Saves'));
    const postType    = col(row, 'Tipo de publicação', 'Post type', 'Media type');
    const url         = col(row, 'URL', 'Link', 'Permalink');
    const er          = calcER(likes, comments, shares, reach);
    const externalId  = url || `${dateRaw}_${postType}_${Number(likes)}`;

    result.push({
      externalId,
      date,
      publishedAt: publishedAt ?? undefined,
      views: impressions,
      likes,
      comments,
      shares,
      reach,
      saves,
      impressions,
      er,
      postType: postType || undefined,
      url: url || undefined,
      watchTimeSec: BigInt(0),
    });
  }

  return result;
}

function parseTikTokDaily(rows: Record<string, string>[]): DailyRow[] {
  const result: DailyRow[] = [];
  for (const row of rows) {
    const dateRaw = col(row, 'Data', 'Date');
    const date = parseDatePtBR(dateRaw);
    if (!date) continue;
    const views    = num(col(row, 'Visualizações de vídeo', 'Video views', 'Views'));
    const likes    = num(col(row, 'Curtidas', 'Likes'));
    const comments = num(col(row, 'Comentários', 'Comments'));
    const shares   = num(col(row, 'Compartilhamentos', 'Shares'));
    const reach    = num(col(row, 'Alcance', 'Reach', 'Unique viewers'));
    const er       = calcER(likes, comments, shares, views > BigInt(0) ? views : BigInt(1));
    result.push({ date, views, reach, impressions: views, likes, comments, shares, er });
  }
  return result;
}

function parseYouTube(rows: Record<string, string>[]): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (const row of rows) {
    const title = col(row, 'Título do vídeo', 'Video title', 'Content');
    if (!title || title.toLowerCase().includes('total') || title === '-') continue;
    const dateRaw     = col(row, 'Data de publicação', 'Publish date', 'Date', 'Published');
    const date        = parseDatePtBR(dateRaw) || new Date();
    const views       = num(col(row, 'Visualizações', 'Views'));
    const likes       = num(col(row, 'Curtidas', 'Likes'));
    const comments    = num(col(row, 'Comentários', 'Comments'));
    const impressions = num(col(row, 'Impressões', 'Impressions'));
    const watchTimeSec = BigInt(Math.round(float(col(row, 'Tempo de exibição (horas)', 'Watch time (hours)', 'Watch time')) * 3600));
    const url         = col(row, 'URL do vídeo', 'Video URL', 'URL');
    const externalId  = url || col(row, 'ID do vídeo', 'Video ID') || `yt_${title.slice(0, 20)}_${dateRaw}`;
    const reach       = num(col(row, 'Espectadores únicos', 'Unique viewers', 'Reach'));
    const er          = calcER(likes, comments, BigInt(0), reach > BigInt(0) ? reach : views > BigInt(0) ? views : BigInt(1));
    result.push({ externalId, date, views, likes, comments, shares: BigInt(0), reach, saves: BigInt(0), impressions, er, postType: 'Vídeo', title, url: url || undefined, watchTimeSec });
  }
  return result;
}

function parseTwitterDaily(rows: Record<string, string>[]): DailyRow[] {
  const result: DailyRow[] = [];
  for (const row of rows) {
    const dateRaw     = col(row, 'Tweet date', 'Date');
    const date        = parseDateEN(dateRaw);
    if (!date) continue;
    const impressions = num(col(row, 'Impressions', 'Impressões'));
    const likes       = num(col(row, 'Likes', 'Curtidas'));
    const shares      = num(col(row, 'Retweets', 'Compartilhamentos'));
    const comments    = num(col(row, 'Replies', 'Respostas', 'Comments'));
    const reach       = num(col(row, 'Reach', 'Alcance'));
    const er          = calcER(likes, comments, shares, impressions > BigInt(0) ? impressions : BigInt(1));
    result.push({ date, views: impressions, reach, impressions, likes, comments, shares, er });
  }
  return result;
}

function parseFacebook(rows: Record<string, string>[]): ParsedRow[] {
  const result: ParsedRow[] = [];
  for (const row of rows) {
    const dateRaw  = col(row, 'Data de publicação', 'Published', 'Post Published Date', 'Date');
    const date     = parseDatePtBR(dateRaw) || parseDateEN(dateRaw);
    if (!date) continue;
    const postId   = col(row, 'Post ID', 'ID da publicação');
    const postType = col(row, 'Tipo de postagem', 'Post type', 'Type');
    const reach    = num(col(row, 'Alcance', 'Reach', 'Post reach'));
    const impressions = num(col(row, 'Impressões', 'Impressions', 'Post impressions'));
    const likes    = num(col(row, 'Reações', 'Reactions', 'Likes', 'Post reactions'));
    const comments = num(col(row, 'Comentários', 'Comments', 'Post comments'));
    const shares   = num(col(row, 'Compartilhamentos', 'Shares', 'Post shares'));
    const url      = col(row, 'URL da publicação', 'Post URL', 'Permalink');
    const externalId = postId || url || `fb_${dateRaw}_${Number(likes)}`;
    const er       = calcER(likes, comments, shares, reach > BigInt(0) ? reach : BigInt(1));
    const knownCols = new Set(['post id','id da publicação','data de publicação','published','tipo de postagem','post type','alcance','reach','impressões','impressions','reações','reactions','likes','comentários','comments','compartilhamentos','shares','url da publicação','permalink']);
    const rawExtra: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v && !knownCols.has(k.toLowerCase())) rawExtra[k] = v;
    }
    result.push({ externalId, date, views: impressions, likes, comments, shares, reach, saves: BigInt(0), impressions, er, postType: postType || undefined, url: url || undefined, watchTimeSec: BigInt(0), rawExtra: Object.keys(rawExtra).length > 0 ? rawExtra : undefined });
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

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
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

    if (plt === 'instagram' || plt === 'youtube' || plt === 'facebook') {
      const parser = plt === 'instagram' ? parseInstagram
                   : plt === 'youtube'   ? parseYouTube
                   : parseFacebook;
      const parsed = parser(rows);
      rowsSkip = rows.length - parsed.length;

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
        } catch { rowsSkip++; }
      }
    }

    if (plt === 'tiktok' || plt === 'twitter') {
      const parser = plt === 'tiktok' ? parseTikTokDaily : parseTwitterDaily;
      const parsed = parser(rows);
      rowsSkip = rows.length - parsed.length;

      for (const d of parsed) {
        try {
          await prisma.dailyMetric.upsert({
            where: { brandId_platform_date: { brandId, platform: plt, date: d.date } },
            update: { views: d.views, reach: d.reach, impressions: d.impressions, likes: d.likes, comments: d.comments, shares: d.shares, er: d.er },
            create: { brandId, platform: plt, date: d.date, views: d.views, reach: d.reach, impressions: d.impressions, likes: d.likes, comments: d.comments, shares: d.shares, er: d.er },
          });
          rowsOk++;
        } catch { rowsSkip++; }
      }
    }

    await prisma.importLog.create({
      data: {
        brandId, platform: plt, filename: file.name,
        rowsTotal: rows.length, rowsOk, rowsSkip,
        status: rowsSkip === rows.length ? 'ERROR' : rowsSkip > 0 ? 'PARTIAL' : 'OK',
      },
    });

    return NextResponse.json({ ok: true, platform: plt, filename: file.name, rowsTotal: rows.length, rowsOk, rowsSkip });

  } catch (err) {
    console.error('[import] erro:', err);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
