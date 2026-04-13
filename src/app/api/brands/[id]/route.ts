import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/brands/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, color } = body as { name?: string; color?: string };

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        ...(name  && { name:  name.trim() }),
        ...(color && { color }),
      },
    });

    return NextResponse.json({ ok: true, brand });
  } catch (err) {
    console.error('[brands PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/brands/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.brand.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[brands DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
