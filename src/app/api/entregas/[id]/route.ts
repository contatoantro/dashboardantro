import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EntregaStatus } from '@prisma/client';

// PATCH /api/entregas/[id] — atualiza status ou dados da entrega
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, nome, investimento, metaCPV } = body;

    const entrega = await prisma.entrega.update({
      where: { id: params.id },
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
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.entrega.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[entregas DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
