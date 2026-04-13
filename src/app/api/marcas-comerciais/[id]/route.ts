// src/app/api/marcas-comerciais/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

// PATCH /api/marcas-comerciais/:id — edita nome, cor ou emoji
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;
    const { id } = await params;
    const body = await req.json();
    const { nome, cor, emoji } = body as { nome?: string; cor?: string; emoji?: string };

    if (!id) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    }

    const exists = await prisma.marcaComercial.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: 'Marca comercial não encontrada' }, { status: 404 });
    }

    const marca = await prisma.marcaComercial.update({
      where: { id },
      data: {
        ...(nome?.trim()  ? { nome: nome.trim() } : {}),
        ...(cor           ? { cor }               : {}),
        ...(emoji         ? { emoji }             : {}),
      },
    });

    return NextResponse.json({ ok: true, marca });
  } catch (err) {
    console.error('[marcas-comerciais PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE /api/marcas-comerciais/:id — remove marca comercial
// As entregas vinculadas têm marcaComercialId → SetNull (definido no schema)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    }

    const exists = await prisma.marcaComercial.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: 'Marca comercial não encontrada' }, { status: 404 });
    }

    await prisma.marcaComercial.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[marcas-comerciais DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
