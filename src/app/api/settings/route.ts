import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

// Chaves permitidas no banco (não armazenar secrets aqui — só prefs de UI)
const ALLOWED_KEYS = new Set([
  'gdrive_folder',
  'gdrive_sync',
  'gdrive_last_sync',
  'gdrive_last_sync_files',
  'auto_insights',
  'email_reports',
  'weekly_digest',
]);

// GET /api/settings — retorna todas as configurações
export async function GET() {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;
    const rows = await prisma.setting.findMany();
    const settings: Record<string, string> = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error('[settings GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT /api/settings — upsert de uma ou mais chaves
// Body: { key: string, value: string } ou { settings: Record<string, string> }
export async function PUT(req: NextRequest) {
  try {
    const unauth = await requireAuth();
    if (unauth) return unauth;

    // Aceita tanto { key, value } quanto { settings: {...} }
    const body = await req.json();
    const pairs: [string, string][] = body.settings
      ? Object.entries(body.settings as Record<string, string>)
      : [[body.key, body.value]];

    const results = await Promise.all(
      pairs
        .filter(([k]) => ALLOWED_KEYS.has(k))
        .map(([key, value]) =>
          prisma.setting.upsert({
            where:  { key },
            update: { value: String(value) },
            create: { key,   value: String(value) },
          })
        )
    );

    return NextResponse.json({ ok: true, updated: results.length });
  } catch (err) {
    console.error('[settings PUT]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
