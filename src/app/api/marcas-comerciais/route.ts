import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

// GET /api/marcas-comerciais — lista todas
export async function GET() {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;

    const marcas = await prisma.marcaComercial.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ ok: true, marcas });
  } catch (err) {
    console.error('[marcas-comerciais GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/marcas-comerciais — cria nova
// Body: { nome: string, cor?: string, emoji?: string }
export async function POST(req: NextRequest) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;

    const body = await req.json();
    const { nome, cor, emoji } = body as { nome?: string; cor?: string; emoji?: string };

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
    }

    const marca = await prisma.marcaComercial.create({
      data: {
        nome: nome.trim(),
        ...(cor   ? { cor }   : {}),
        ...(emoji ? { emoji } : {}),
      },
    });

    return NextResponse.json({ ok: true, marca }, { status: 201 });
  } catch (err) {
    console.error('[marcas-comerciais POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
