import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Platform } from '@prisma/client';

// ─── GET /api/followers?brandId=xxx ──────────────────────────────────────────
// Retorna o snapshot mais recente de cada plataforma para a brand.

export async function GET(req: NextRequest) {
  try {
    const brandId = new URL(req.url).searchParams.get('brandId');
    if (!brandId) return NextResponse.json({ error: 'brandId obrigatório' }, { status: 400 });

    const platforms: Platform[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'];

    const snaps = await Promise.all(
      platforms.map(async plt => {
        const snap = await prisma.followerSnapshot.findFirst({
          where:   { brandId, platform: plt },
          orderBy: { recordedAt: 'desc' },
          select:  { count: true, recordedAt: true },
        });
        return {
          platform:   plt,
          count:      snap ? Number(snap.count) : null,
          recordedAt: snap?.recordedAt ?? null,
        };
      })
    );

    return NextResponse.json({ ok: true, followers: snaps });
  } catch (err) {
    console.error('[followers GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ─── POST /api/followers — salva um novo snapshot ────────────────────────────
// Body: { brandId, platform, count }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, platform, count } = body as {
      brandId: string; platform: string; count: number;
    };

    if (!brandId || !platform || count == null) {
      return NextResponse.json({ error: 'brandId, platform e count obrigatórios' }, { status: 400 });
    }

    if (!Object.values(Platform).includes(platform as Platform)) {
      return NextResponse.json({ error: `platform inválido: ${platform}` }, { status: 400 });
    }

    const parsedCount = Math.round(Number(count));
    if (isNaN(parsedCount) || parsedCount < 0) {
      return NextResponse.json({ error: 'count deve ser um número positivo' }, { status: 400 });
    }

    const snap = await prisma.followerSnapshot.create({
      data: {
        brandId,
        platform: platform as Platform,
        count:    parsedCount,
      },
    });

    return NextResponse.json({ ok: true, snapshot: { ...snap, count: Number(snap.count) } }, { status: 201 });
  } catch (err) {
    console.error('[followers POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
