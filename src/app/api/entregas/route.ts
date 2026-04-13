import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EntregaTipo, EntregaStatus } from '@prisma/client';

// GET /api/entregas?brandId=xxx
export async function GET(req: NextRequest) {
  try {
    const brandId = new URL(req.url).searchParams.get('brandId');
    if (!brandId) return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });

    const entregas = await prisma.entrega.findMany({
      where:   { brandId },
      include: { posts: true },
      orderBy: { criadaEm: 'desc' },
    });

    return NextResponse.json({ ok: true, entregas });
  } catch (err) {
    console.error('[entregas GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST /api/entregas — cria nova entrega com posts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, marcaComercialId, tipo, nome, plataforma, investimento, metaCPV, status, posts } = body;

    if (!brandId || !nome || !tipo) {
      return NextResponse.json({ error: 'brandId, nome e tipo obrigatórios' }, { status: 400 });
    }

    const entrega = await prisma.entrega.create({
      data: {
        brandId,
        tipo:             tipo as EntregaTipo,
        nome:             nome.trim(),
        plataforma:       plataforma ?? 'Instagram',
        investimento:     Number(investimento) || 0,
        metaCPV:          metaCPV ? Number(metaCPV) : null,
        status:           (status as EntregaStatus) ?? 'pendente',
        // Vínculo com marca comercial (opcional)
        ...(marcaComercialId ? { marcaComercialId } : {}),
        posts: {
          create: (posts ?? []).map((p: {
            link: string; data: string; views: number; alcance: number;
            curtidas: number; compartilhamentos: number; salvamentos: number; comentarios: number;
          }) => ({
            link:              p.link,
            data:              p.data,
            views:             Number(p.views)             || 0,
            alcance:           Number(p.alcance)           || 0,
            curtidas:          Number(p.curtidas)          || 0,
            compartilhamentos: Number(p.compartilhamentos) || 0,
            salvamentos:       Number(p.salvamentos)       || 0,
            comentarios:       Number(p.comentarios)       || 0,
          })),
        },
      },
      include: { posts: true },
    });

    return NextResponse.json({ ok: true, entrega }, { status: 201 });
  } catch (err) {
    console.error('[entregas POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
