import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ─── GET /api/goals?brandId=xxx ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const brandId = new URL(req.url).searchParams.get('brandId');
    if (!brandId) return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });

    const goals = await prisma.goal.findMany({
      where:   { brandId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ ok: true, goals });
  } catch (err) {
    console.error('[goals GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── POST /api/goals — cria uma nova meta ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, title, platform, kpi, current, expected, target, pct, expPct, status, deadline } = body;

    if (!brandId || !title || !target) {
      return NextResponse.json({ error: 'brandId, title e target obrigatórios' }, { status: 400 });
    }

    const goal = await prisma.goal.create({
      data: {
        brandId,
        platform: platform ?? 'all',
        kpi:      kpi      ?? '',
        target:   String(target),
        current:  String(current ?? ''),
        expected: String(expected ?? ''),
        pct:      Number(pct)    || 0,
        expPct:   Number(expPct) || 0,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json({ ok: true, goal }, { status: 201 });
  } catch (err) {
    console.error('[goals POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
