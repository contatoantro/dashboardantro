import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/insights?brandId=xxx&from=ISO&to=ISO&limit=20
// Lista insights persistidos no banco para a brand/período.

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const fromStr = searchParams.get('from');
    const toStr   = searchParams.get('to');
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

    if (!brandId) {
      return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });
    }

    const where: Record<string, unknown> = { brandId };

    // Filtro de período: retorna insights cujos ranges se sobreponham ao pedido
    if (fromStr && toStr) {
      const from = new Date(fromStr);
      const to   = new Date(toStr);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        where.fromDate = { lte: to };
        where.toDate   = { gte: from };
      }
    }

    const rows = await prisma.insight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true, platform: true, type: true,
        title: true, body: true, delta: true,
        deltaLabel: true, tag: true, createdAt: true,
      },
    });

    // Formata age para exibição (ex: "2h atrás", "3d atrás")
    const now = Date.now();
    const insights = rows.map(r => {
      const diffMs  = now - r.createdAt.getTime();
      const diffMin = Math.floor(diffMs / 60_000);
      const diffH   = Math.floor(diffMin / 60);
      const diffD   = Math.floor(diffH / 24);
      const age = diffD > 0 ? `${diffD}d atrás`
                : diffH > 0 ? `${diffH}h atrás`
                : diffMin > 0 ? `${diffMin}min atrás`
                : 'agora';
      return { ...r, age, isReal: true };
    });

    return NextResponse.json({ ok: true, insights });
  } catch (err) {
    console.error('[insights GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
