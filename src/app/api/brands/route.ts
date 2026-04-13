import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/brands — lista todas as brands
export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, color: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, brands });
  } catch (err) {
    console.error('[brands GET] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/brands — cria uma nova brand
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color } = body as { name?: string; color?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: { name: name.trim(), color: color ?? '#4ade80' },
    });

    return NextResponse.json({ ok: true, brand }, { status: 201 });
  } catch (err) {
    console.error('[brands POST] erro:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
