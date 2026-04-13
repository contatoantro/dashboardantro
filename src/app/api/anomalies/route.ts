import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

// GET /api/anomalies?brandId=xxx&platform=xxx&from=ISO&to=ISO&metric=views
//
// Retorna pontos anômalos da série temporal usando Z-score com janela móvel.
// Threshold: |z| >= 2.0  →  anomalia
// Mínimo de 7 pontos na janela antes de começar a detectar.

export interface AnomalyPoint {
  label:  string;   // ex: "15/01"
  index:  number;   // posição no array de labels/values
  value:  number;
  zscore: number;
  type:   'peak' | 'drop';  // pico ou queda
}

const Z_THRESHOLD  = 2.0;
const WINDOW_MIN   = 7;    // mínimo de pontos históricos para calcular z-score

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

// Z-score com janela móvel: compara cada ponto com a média/desvio dos N anteriores
function detectAnomalies(
  labels: string[],
  values: number[],
): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];

  for (let i = WINDOW_MIN; i < values.length; i++) {
    const window = values.slice(Math.max(0, i - 30), i); // até 30 dias de janela
    if (window.length < WINDOW_MIN) continue;

    // Filtra zeros da janela para não distorcer média em períodos sem dados
    const nonZero = window.filter(v => v > 0);
    if (nonZero.length < 3) continue;

    const mean   = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
    const stddev = Math.sqrt(nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZero.length);

    if (stddev === 0) continue;

    const current = values[i];
    if (current === 0) continue; // ignora dias sem dados

    const zscore = (current - mean) / stddev;

    if (Math.abs(zscore) >= Z_THRESHOLD) {
      anomalies.push({
        label:  labels[i],
        index:  i,
        value:  current,
        zscore: Math.round(zscore * 100) / 100,
        type:   zscore > 0 ? 'peak' : 'drop',
      });
    }
  }

  return anomalies;
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
      return NextResponse.json(
        { error: 'brandId, platform, from e to obrigatórios' },
        { status: 400 }
      );
    }

    if (!Object.values(Platform).includes(platform as Platform)) {
      return NextResponse.json({ error: `Plataforma inválida: ${platform}` }, { status: 400 });
    }

    const plt  = platform as Platform;
    const from = new Date(fromStr);
    const to   = new Date(toStr);
    const dates = dateRange(from, to);

    const labels: string[] = [];
    const values: number[] = [];

    // ── Posts individuais (Instagram, YouTube, Facebook) ──────────────────────
    if (plt === 'instagram' || plt === 'youtube' || plt === 'facebook') {
      const posts = await prisma.post.findMany({
        where:   { brandId, platform: plt, date: { gte: from, lt: to } },
        select:  { date: true, views: true, reach: true, likes: true, er: true },
        orderBy: { date: 'asc' },
      });

      const byDay = new Map<string, { views: number; reach: number; likes: number; er: number; count: number }>();
      for (const p of posts) {
        const k    = dateKey(new Date(p.date));
        const prev = byDay.get(k) ?? { views: 0, reach: 0, likes: 0, er: 0, count: 0 };
        byDay.set(k, {
          views: prev.views + Number(p.views),
          reach: prev.reach + Number(p.reach),
          likes: prev.likes + Number(p.likes),
          er:    prev.er    + p.er,
          count: prev.count + 1,
        });
      }

      for (const date of dates) {
        const k   = dateKey(date);
        const day = byDay.get(k);
        labels.push(formatLabel(date));
        if (!day) { values.push(0); continue; }
        switch (metric) {
          case 'er':    values.push(day.count > 0 ? day.er / day.count : 0); break;
          case 'reach': values.push(day.reach); break;
          case 'likes': values.push(day.likes); break;
          default:      values.push(day.views); break;
        }
      }
    }

    // ── Métricas diárias (TikTok, Twitter) ───────────────────────────────────
    if (plt === 'tiktok' || plt === 'twitter') {
      const daily = await prisma.dailyMetric.findMany({
        where:   { brandId, platform: plt, date: { gte: from, lt: to } },
        select:  { date: true, views: true, reach: true, likes: true, er: true, impressions: true },
        orderBy: { date: 'asc' },
      });

      const byDay = new Map<string, { views: number; reach: number; likes: number; er: number; impressions: number }>();
      for (const d of daily) {
        byDay.set(dateKey(new Date(d.date)), {
          views:       Number(d.views),
          reach:       Number(d.reach),
          likes:       Number(d.likes),
          er:          d.er,
          impressions: Number(d.impressions),
        });
      }

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
          default:            values.push(day.views);       break;
        }
      }
    }

    const anomalies = detectAnomalies(labels, values);

    return NextResponse.json({
      ok: true,
      platform: plt,
      metric,
      labels,
      values,
      anomalies,
      threshold: Z_THRESHOLD,
    });

  } catch (err) {
    console.error('[anomalies] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
