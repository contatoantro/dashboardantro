import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EntregaStatus } from '@prisma/client';

// PATCH /api/entregas/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, nome, investimento, metaCPV } = body;

    const entrega = await prisma.entrega.update({
      where: { id },
      data: {
        ...(status      && { status:      status as EntregaStatus }),
        ...(nome        && { nome:        nome.trim() }),
        ...(investimento != null && { investimento: Number(investimento) }),
        ...(metaCPV     != null && { metaCPV:     metaCPV ? Number(metaCPV) : null }),
      },
      include: { posts: true },
    });

    return NextResponse.json({ ok: true, entrega });
  } catch (err) {
    console.error('[entregas PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/entregas/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.entrega.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[entregas DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
