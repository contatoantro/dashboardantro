// src/app/api/export/report/route.ts
// Sprint 5 — Exportação de relatório
// GET /api/export/report?brandId=...&from=...&to=...&label=...
// Retorna JSON com dados do relatório → o Header.tsx converte em HTML e abre Print Dialog

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'];
const PLT_LABEL: Record<string, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube',
  twitter: 'Twitter/X', facebook: 'Facebook',
};

function fmt(n: bigint | number | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('pt-BR');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');
    const label   = searchParams.get('label') ?? '';

    if (!brandId || !fromStr || !toStr) {
      return NextResponse.json({ error: 'brandId, from e to são obrigatórios' }, { status: 400 });
    }

    const from = new Date(fromStr);
    const to   = new Date(toStr);

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { name: true, color: true },
    });
    if (!brand) return NextResponse.json({ error: 'Brand não encontrada' }, { status: 404 });

    // ── KPIs por plataforma ──────────────────────────────────────────────────
    const kpis: Array<{
      platform: string; label: string;
      views: string; reach: string; likes: string; er: string; volume: string;
    }> = [];

    for (const plt of PLATFORMS) {
      const usesDaily = plt === 'tiktok' || plt === 'twitter';

      if (usesDaily) {
        const r = await prisma.dailyMetric.aggregate({
          where: { brandId, platform: plt, date: { gte: from, lt: to } },
          _sum:   { views: true, reach: true, likes: true },
          _avg:   { er: true },
          _count: { id: true },
        });
        if (r._count.id > 0) {
          kpis.push({
            platform: plt, label: PLT_LABEL[plt],
            views:  fmt(r._sum.views),
            reach:  fmt(r._sum.reach),
            likes:  fmt(r._sum.likes),
            er:     `${(r._avg.er ?? 0).toFixed(2)}%`,
            volume: `${r._count.id} dias`,
          });
        }
      } else {
        const r = await prisma.post.aggregate({
          where: { brandId, platform: plt, date: { gte: from, lt: to } },
          _sum:   { views: true, reach: true, likes: true, comments: true, shares: true },
          _avg:   { er: true },
          _count: { id: true },
        });
        if (r._count.id > 0) {
          kpis.push({
            platform: plt, label: PLT_LABEL[plt],
            views:  fmt(r._sum.views),
            reach:  fmt(r._sum.reach),
            likes:  fmt(r._sum.likes),
            er:     `${(r._avg.er ?? 0).toFixed(2)}%`,
            volume: `${r._count.id} posts`,
          });
        }
      }
    }

    // ── Top 10 posts por ER ──────────────────────────────────────────────────
    const topPosts = await prisma.post.findMany({
      where: { brandId, date: { gte: from, lt: to } },
      orderBy: { er: 'desc' },
      take: 10,
      select: {
        platform: true, title: true, postType: true,
        views: true, likes: true, er: true, url: true, date: true,
      },
    });

    const posts = topPosts.map(p => ({
      platform: PLT_LABEL[p.platform] ?? p.platform,
      title:    p.title ?? p.postType ?? '—',
      views:    fmt(p.views),
      likes:    fmt(p.likes),
      er:       `${p.er.toFixed(2)}%`,
      url:      p.url ?? '',
      date:     p.date.toLocaleDateString('pt-BR'),
    }));

    const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return NextResponse.json({
      ok: true,
      report: {
        brand:      brand.name,
        brandColor: brand.color ?? '#4ade80',
        period:     label || `${from.toLocaleDateString('pt-BR')} – ${to.toLocaleDateString('pt-BR')}`,
        generatedAt,
        kpis,
        posts,
      },
    });

  } catch (err) {
    console.error('[export/report]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
