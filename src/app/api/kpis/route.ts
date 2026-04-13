import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function delta(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? '+100%' : '0%';
  const pct  = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function prevRange(from: Date, to: Date): { from: Date; to: Date } {
  const diff = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - diff), to: new Date(from.getTime()) };
}

// ─── Agregações ───────────────────────────────────────────────────────────────

async function aggregatePosts(brandId: string, platform: Platform, from: Date, to: Date) {
  const r = await prisma.post.aggregate({
    where: { brandId, platform, date: { gte: from, lt: to } },
    _sum:   { views: true, likes: true, comments: true, shares: true, reach: true, saves: true, watchTimeSec: true },
    _count: { id: true },
    _avg:   { er: true },
  });
  return {
    views:        Number(r._sum.views        ?? 0),
    likes:        Number(r._sum.likes        ?? 0),
    comments:     Number(r._sum.comments     ?? 0),
    shares:       Number(r._sum.shares       ?? 0),
    reach:        Number(r._sum.reach        ?? 0),
    watchTimeSec: Number(r._sum.watchTimeSec ?? 0),
    posts:        r._count.id,
    er:           r._avg.er ?? 0,
  };
}

async function aggregateDaily(brandId: string, platform: Platform, from: Date, to: Date) {
  const r = await prisma.dailyMetric.aggregate({
    where: { brandId, platform, date: { gte: from, lt: to } },
    _sum:   { views: true, likes: true, comments: true, shares: true, reach: true, impressions: true },
    _count: { id: true },
    _avg:   { er: true },
  });
  return {
    views:       Number(r._sum.views       ?? 0),
    likes:       Number(r._sum.likes       ?? 0),
    comments:    Number(r._sum.comments    ?? 0),
    shares:      Number(r._sum.shares      ?? 0),
    reach:       Number(r._sum.reach       ?? 0),
    impressions: Number(r._sum.impressions ?? 0),
    posts:       r._count.id,
    er:          r._avg.er ?? 0,
  };
}

async function getLatestFollowers(brandId: string, platform: Platform): Promise<number> {
  const snap = await prisma.followerSnapshot.findFirst({
    where: { brandId, platform },
    orderBy: { recordedAt: 'desc' },
  });
  return snap ? Number(snap.count) : 0;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId  = searchParams.get('brandId');
    const platform = searchParams.get('platform'); // null = overview
    const fromStr  = searchParams.get('from');
    const toStr    = searchParams.get('to');

    // Suporte a meses disponíveis
    if (searchParams.get('action') === 'availableMonths') {
      return handleAvailableMonths(brandId);
    }

    if (!brandId) {
      return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });
    }

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'from e to obrigatórios (ISO date)' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to   = new Date(toStr);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'from/to inválidos' }, { status: 400 });
    }

    const prev = prevRange(from, to);

    const platforms: Platform[] = platform && Object.values(Platform).includes(platform as Platform)
      ? [platform as Platform]
      : ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'];

    const results: Record<string, any> = {};

    for (const plt of platforms) {
      const usesDaily = plt === 'tiktok';

      const [curr, prevData] = await Promise.all([
        usesDaily ? aggregateDaily(brandId, plt, from, to)       : aggregatePosts(brandId, plt, from, to),
        usesDaily ? aggregateDaily(brandId, plt, prev.from, prev.to) : aggregatePosts(brandId, plt, prev.from, prev.to),
      ]);

      const followers = await getLatestFollowers(brandId, plt);

      const wtCurr = 'watchTimeSec' in curr ? Math.round((curr as any).watchTimeSec / 3600) : 0;
      const wtPrev = 'watchTimeSec' in prevData ? Math.round((prevData as any).watchTimeSec / 3600) : 0;

      results[plt] = {
        views:     curr.views,
        reach:     curr.reach,
        likes:     curr.likes,
        comments:  curr.comments,
        shares:    curr.shares,
        posts:     curr.posts,
        er:        curr.er,
        watchTimeH: wtCurr,
        followers,
        fmt: {
          views:     fmtNumber(curr.views),
          reach:     fmtNumber(curr.reach),
          likes:     fmtNumber(curr.likes),
          comments:  fmtNumber(curr.comments),
          shares:    fmtNumber(curr.shares),
          posts:     fmtNumber(curr.posts),
          er:        `${curr.er.toFixed(2)}%`,
          followers: fmtNumber(followers),
          watchTimeH: fmtNumber(wtCurr),
        },
        delta: {
          views:    delta(curr.views,    prevData.views),
          reach:    delta(curr.reach,    prevData.reach),
          likes:    delta(curr.likes,    prevData.likes),
          posts:    delta(curr.posts,    prevData.posts),
          er:       `${(curr.er - prevData.er) >= 0 ? '+' : ''}${(curr.er - prevData.er).toFixed(2)}pp`,
          watchTimeH: delta(wtCurr, wtPrev),
          followers: '—',
        },
        hasData: curr.views > 0 || curr.posts > 0,
      };
    }

    // Overview: soma de todas as plataformas
    if (!platform) {
      const totViews     = platforms.reduce((s, p) => s + (results[p].views    ?? 0), 0);
      const totReach     = platforms.reduce((s, p) => s + (results[p].reach    ?? 0), 0);
      const totPosts     = platforms.reduce((s, p) => s + (results[p].posts    ?? 0), 0);
      const totFollowers = platforms.reduce((s, p) => s + (results[p].followers ?? 0), 0);
      const avgER        = platforms.reduce((s, p) => s + (results[p].er       ?? 0), 0) / platforms.length;

      // Prev para overview
      const prevAll = await Promise.all(platforms.map(plt => {
        const usesDaily = plt === 'tiktok';
        return usesDaily
          ? aggregateDaily(brandId, plt, prev.from, prev.to)
          : aggregatePosts(brandId, plt, prev.from, prev.to);
      }));
      const prevViews = prevAll.reduce((s, r) => s + r.views, 0);
      const prevReach = prevAll.reduce((s, r) => s + r.reach, 0);
      const prevPosts = prevAll.reduce((s, r) => s + r.posts, 0);
      const prevER    = prevAll.reduce((s, r) => s + r.er,    0) / platforms.length;

      results['overview'] = {
        views: totViews, reach: totReach, posts: totPosts, followers: totFollowers, er: avgER,
        fmt: {
          views:     fmtNumber(totViews),
          reach:     fmtNumber(totReach),
          posts:     fmtNumber(totPosts),
          er:        `${avgER.toFixed(2)}%`,
          followers: fmtNumber(totFollowers),
        },
        delta: {
          views: delta(totViews, prevViews),
          reach: delta(totReach, prevReach),
          posts: delta(totPosts, prevPosts),
          er:    `${(avgER - prevER) >= 0 ? '+' : ''}${(avgER - prevER).toFixed(2)}pp`,
        },
        hasData: totViews > 0 || totPosts > 0,
      };
    }

    return NextResponse.json({ ok: true, from, to, data: results });

  } catch (err) {
    console.error('[kpis] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── Meses disponíveis ────────────────────────────────────────────────────────

async function handleAvailableMonths(brandId: string | null) {
  if (!brandId) {
    return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });
  }

  try {
    // Busca a data mais antiga e mais recente com dados
    const [oldestPost, newestPost, oldestDaily, newestDaily] = await Promise.all([
      prisma.post.findFirst({ where: { brandId }, orderBy: { date: 'asc'  }, select: { date: true } }),
      prisma.post.findFirst({ where: { brandId }, orderBy: { date: 'desc' }, select: { date: true } }),
      prisma.dailyMetric.findFirst({ where: { brandId }, orderBy: { date: 'asc'  }, select: { date: true } }),
      prisma.dailyMetric.findFirst({ where: { brandId }, orderBy: { date: 'desc' }, select: { date: true } }),
    ]);

    const dates = [oldestPost?.date, newestPost?.date, oldestDaily?.date, newestDaily?.date]
      .filter(Boolean) as Date[];

    if (dates.length === 0) {
      return NextResponse.json({ ok: true, months: [] });
    }

    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Limita a 24 meses para trás a partir do mês mais recente com dados
    // Isso evita que CSVs históricos (ex: YouTube desde 2016) poluam o seletor
    const minLimit = new Date(maxDate.getFullYear(), maxDate.getMonth() - 23, 1);
    const minDate  = new Date(Math.max(
      new Date(Math.min(...dates.map(d => d.getTime()))).getTime(),
      minLimit.getTime()
    ));

    // Gera array de meses entre min e max
    const months: { from: string; to: string; label: string }[] = [];
    const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    let cur = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    while (cur <= end) {
      const from = new Date(cur);
      const to   = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      months.push({
        from:  from.toISOString(),
        to:    to.toISOString(),
        label: `${MONTHS_PT[from.getMonth()]} ${from.getFullYear()}`,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    return NextResponse.json({ ok: true, months });
  } catch (err) {
    console.error('[kpis/availableMonths] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
