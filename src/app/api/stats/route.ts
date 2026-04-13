import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

// ─── GET /api/stats ───────────────────────────────────────────────────────────
// Query params: brandId, platform, from, to, stat (types | hours | video_len)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const brandId  = searchParams.get('brandId');
    const platform = searchParams.get('platform');
    const fromStr  = searchParams.get('from');
    const toStr    = searchParams.get('to');
    const stat     = searchParams.get('stat');

    if (!brandId || !platform || !fromStr || !toStr || !stat) {
      return NextResponse.json({ error: 'brandId, platform, from, to e stat obrigatórios' }, { status: 400 });
    }
    if (!Object.values(Platform).includes(platform as Platform)) {
      return NextResponse.json({ error: `platform inválido: ${platform}` }, { status: 400 });
    }

    const plt  = platform as Platform;
    const from = new Date(fromStr);
    const to   = new Date(toStr);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'from/to inválidos' }, { status: 400 });
    }

    const where = { brandId, platform: plt, date: { gte: from, lt: to } };

    // ── types ─────────────────────────────────────────────────────────────────
    if (stat === 'types') {
      const rows = await prisma.post.groupBy({
        by:     ['postType'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      });
      return NextResponse.json({
        ok: true, stat: 'types',
        labels: rows.map(r => r.postType ?? 'Outro'),
        data:   rows.map(r => r._count.id),
      });
    }

    // ── hours — Sprint 4: usa publishedAt quando disponível ──────────────────
    if (stat === 'hours') {
      // Busca publishedAt (campo novo) e date (fallback)
      const posts = await prisma.post.findMany({
        where,
        select: { publishedAt: true, date: true },
      });

      const buckets = new Array(24).fill(0);
      let hasPublishedAt = 0;

      posts.forEach(p => {
        // Prioriza publishedAt (tem hora real); fallback para date (hora zerada)
        const ref = p.publishedAt ?? p.date;
        const hour = new Date(ref).getHours();
        buckets[hour]++;
        if (p.publishedAt) hasPublishedAt++;
      });

      // Se nenhum post tem publishedAt, retorna vazio com aviso
      // (evita mostrar gráfico enganoso com tudo em 0h)
      if (hasPublishedAt === 0) {
        return NextResponse.json({
          ok: true, stat: 'hours',
          labels: [], data: [],
          warning: 'Nenhum horário de publicação disponível. Reimporte o CSV do Instagram.',
        });
      }

      const labels: string[] = [];
      const data:   number[] = [];
      for (let h = 8; h <= 22; h += 2) {
        labels.push(`${h}h`);
        data.push(buckets[h] + (buckets[h + 1] ?? 0));
      }

      return NextResponse.json({ ok: true, stat: 'hours', labels, data });
    }

    // ── video_len ─────────────────────────────────────────────────────────────
    if (stat === 'video_len') {
      const posts = await prisma.post.findMany({
        where,
        select: { watchTimeSec: true },
        orderBy: { watchTimeSec: 'asc' },
      });

      const buckets = [0, 0, 0, 0, 0];
      posts.forEach(p => {
        const s = Number(p.watchTimeSec);
        if      (s <   60) buckets[0]++;
        else if (s <  180) buckets[1]++;
        else if (s <  600) buckets[2]++;
        else if (s < 1800) buckets[3]++;
        else               buckets[4]++;
      });

      return NextResponse.json({
        ok: true, stat: 'video_len',
        labels: ['<1min', '1-3min', '3-10min', '10-30min', '>30min'],
        data:   buckets,
      });
    }

    return NextResponse.json({ error: `stat inválido: ${stat}. Use: types | hours | video_len` }, { status: 400 });

  } catch (err) {
    console.error('[stats] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
