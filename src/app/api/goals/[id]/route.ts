import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/goals/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, platform, kpi, current, expected, target, pct, expPct, status, deadline } = body;

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(platform !== undefined && { platform: String(platform) }),
        ...(kpi      !== undefined && { kpi:      String(kpi) }),
        ...(target   !== undefined && { target:   String(target) }),
        ...(current  !== undefined && { current:  String(current) }),
        ...(expected !== undefined && { expected: String(expected) }),
        ...(pct      !== undefined && { pct:      Number(pct) }),
        ...(expPct   !== undefined && { expPct:   Number(expPct) }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(title    !== undefined && { title:    String(title) }),
      },
    });

    return NextResponse.json({ ok: true, goal });
  } catch (err) {
    console.error('[goals PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/goals/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[goals DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
