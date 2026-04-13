import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
}

function dateRange(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(from);
  while (cur < to) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId  = searchParams.get('brandId');
    const platform = searchParams.get('platform');
    const fromStr  = searchParams.get('from');
    const toStr    = searchParams.get('to');
    const metric   = searchParams.get('metric') ?? 'views';

    if (!brandId || !platform || !fromStr || !toStr) {
      return NextResponse.json({ error: 'brandId, platform, from e to obrigatórios' }, { status: 400 });
    }

    if (!Object.values(Platform).includes(platform as Platform)) {
      return NextResponse.json({ error: `Plataforma inválida: ${platform}` }, { status: 400 });
    }

    const plt  = platform as Platform;
    const from = new Date(fromStr);
    const to   = new Date(toStr);
    const dates = dateRange(from, to);

    // ── Posts individuais ──
    if (plt === 'instagram' || plt === 'youtube' || plt === 'facebook') {
      const posts = await prisma.post.findMany({
        where: { brandId, platform: plt, date: { gte: from, lt: to } },
        select: { date: true, views: true, reach: true, likes: true, comments: true, er: true, watchTimeSec: true },
        orderBy: { date: 'asc' },
      });

      const byDay = new Map<string, { views: number; reach: number; likes: number; er: number; watchTimeH: number; count: number }>();
      for (const p of posts) {
        const k = dateKey(new Date(p.date));
        const prev = byDay.get(k) ?? { views: 0, reach: 0, likes: 0, er: 0, watchTimeH: 0, count: 0 };
        byDay.set(k, {
          views:      prev.views      + Number(p.views),
          reach:      prev.reach      + Number(p.reach),
          likes:      prev.likes      + Number(p.likes),
          er:         prev.er         + p.er,
          watchTimeH: prev.watchTimeH + Math.round(Number(p.watchTimeSec ?? 0) / 3600),
          count:      prev.count      + 1,
        });
      }

      const labels: string[] = [];
      const values: number[] = [];
      for (const date of dates) {
        const k   = dateKey(date);
        const day = byDay.get(k);
        labels.push(formatLabel(date));
        if (!day) { values.push(0); continue; }
        switch (metric) {
          case 'er':         values.push(day.count > 0 ? Math.round((day.er / day.count) * 100) / 100 : 0); break;
          case 'reach':      values.push(day.reach); break;
          case 'likes':      values.push(day.likes); break;
          case 'watch_time': values.push(day.watchTimeH); break;
          default:           values.push(day.views); break;
        }
      }

      return NextResponse.json({ ok: true, platform: plt, metric, labels, values });
    }

    // ── Métricas diárias ──
    if (plt === 'tiktok' || plt === 'twitter') {
      const daily = await prisma.dailyMetric.findMany({
        where: { brandId, platform: plt, date: { gte: from, lt: to } },
        select: { date: true, views: true, reach: true, likes: true, comments: true, shares: true, er: true, impressions: true },
        orderBy: { date: 'asc' },
      });

      const byDay = new Map<string, { views: number; reach: number; likes: number; comments: number; shares: number; er: number; impressions: number }>();
      for (const d of daily) {
        const k = dateKey(new Date(d.date));
        byDay.set(k, {
          views:       Number(d.views),
          reach:       Number(d.reach),
          likes:       Number(d.likes),
          comments:    Number(d.comments),
          shares:      Number(d.shares),
          er:          d.er,
          impressions: Number(d.impressions),
        });
      }

      const labels: string[] = [];
      const values: number[] = [];
      for (const date of dates) {
        const k   = dateKey(date);
        const day = byDay.get(k);
        labels.push(formatLabel(date));
        if (!day) { values.push(0); continue; }
        switch (metric) {
          case 'er':          values.push(day.er);          break;
          case 'reach':       values.push(day.reach);       break;
          case 'likes':       values.push(day.likes);       break;
          case 'impressions': values.push(day.impressions); break;
          case 'engagement':  values.push(day.likes + day.comments + day.shares); break;
          default:            values.push(day.views);       break;
        }
      }

      return NextResponse.json({ ok: true, platform: plt, metric, labels, values });
    }

    return NextResponse.json({ error: 'Plataforma não suportada' }, { status: 400 });

  } catch (err) {
    console.error('[metrics] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
