import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: bigint | number | null): number {
  if (n == null) return 0;
  return typeof n === 'bigint' ? Number(n) : n;
}

// ─── GET /api/posts ───────────────────────────────────────────────────────────
// Query params:
//   brandId   string  obrigatório
//   platform  string  obrigatório (instagram | tiktok | youtube | twitter | facebook)
//   from      string  ISO date (inclusive)
//   to        string  ISO date (exclusive)
//   limit     number  default 50, max 200
//   offset    number  default 0
//   sort      string  views | likes | er | date  (default: views desc)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const brandId   = searchParams.get('brandId');
    const platform  = searchParams.get('platform');
    const fromStr   = searchParams.get('from');
    const toStr     = searchParams.get('to');
    const limitStr  = searchParams.get('limit')  ?? '50';
    const offsetStr = searchParams.get('offset') ?? '0';
    const sort      = searchParams.get('sort')   ?? 'views';

    // ── Validações ────────────────────────────────────────────────────────────
    if (!brandId) {
      return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });
    }
    if (!platform || !Object.values(Platform).includes(platform as Platform)) {
      return NextResponse.json({ error: `platform inválido: ${platform}` }, { status: 400 });
    }
    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'from e to obrigatórios (ISO date)' }, { status: 400 });
    }

    const from   = new Date(fromStr);
    const to     = new Date(toStr);
    const limit  = Math.min(parseInt(limitStr,  10) || 50,  200);
    const offset = Math.max(parseInt(offsetStr, 10) || 0,   0);
    const plt    = platform as Platform;

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'from/to inválidos' }, { status: 400 });
    }

    // ── Ordenação ─────────────────────────────────────────────────────────────
    type OrderBy = { views?: 'desc'; likes?: 'desc'; er?: 'desc'; date?: 'desc' };
    const orderBy: OrderBy =
      sort === 'likes' ? { likes: 'desc' }
      : sort === 'er'  ? { er:    'desc' }
      : sort === 'date' ? { date: 'desc' }
      : { views: 'desc' };

    // ── Plataformas com posts individuais ─────────────────────────────────────
    // TikTok e Twitter usam DailyMetric — retornam linhas diárias como "posts"
    const usesDaily = plt === 'tiktok' || plt === 'twitter';

    if (usesDaily) {
      const rows = await prisma.dailyMetric.findMany({
        where:   { brandId, platform: plt, date: { gte: from, lt: to } },
        orderBy: sort === 'er' ? { er: 'desc' } : sort === 'likes' ? { likes: 'desc' } : { date: 'desc' },
        take:    limit,
        skip:    offset,
        select:  { id: true, date: true, views: true, likes: true, reach: true, impressions: true, er: true },
      });

      const total = await prisma.dailyMetric.count({
        where: { brandId, platform: plt, date: { gte: from, lt: to } },
      });

      const posts = rows.map(r => ({
        id:        r.id,
        type:      'Diário',
        caption:   new Date(r.date).toLocaleDateString('pt-BR'),
        date:      r.date.toISOString(),
        views:     fmt(r.views),
        likes:     fmt(r.likes),
        reach:     fmt(r.reach),
        impressions: fmt(r.impressions),
        comments:  0,
        shares:    0,
        er:        r.er,
        permalink: null,
      }));

      return NextResponse.json({ ok: true, platform: plt, total, limit, offset, posts });
    }

    // ── Posts individuais (IG, YouTube, Facebook) ─────────────────────────────
    const where = { brandId, platform: plt, date: { gte: from, lt: to } };

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        take:   limit,
        skip:   offset,
        select: {
          id:          true,
          date:        true,
          postType:    true,
          title:       true,
          url:         true,
          views:       true,
          likes:       true,
          comments:    true,
          shares:      true,
          reach:       true,
          saves:       true,
          impressions: true,
          watchTimeSec:true,
          er:          true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    const posts = rows.map(r => ({
      id:          r.id,
      type:        r.postType ?? null,
      caption:     r.title   ?? null,
      date:        r.date.toISOString(),
      views:       fmt(r.views),
      likes:       fmt(r.likes),
      comments:    fmt(r.comments),
      shares:      fmt(r.shares),
      reach:       fmt(r.reach),
      saves:       fmt(r.saves),
      impressions: fmt(r.impressions),
      watchTimeSec: fmt(r.watchTimeSec),
      er:          r.er,
      permalink:   r.url ?? null,
    }));

    return NextResponse.json({ ok: true, platform: plt, total, limit, offset, posts });

  } catch (err) {
    console.error('[posts] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
