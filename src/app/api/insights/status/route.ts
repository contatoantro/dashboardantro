import { NextResponse } from 'next/server';

// GET /api/insights/status
// Retorna se a Anthropic API key está configurada no ambiente.
// Não expõe a key — apenas um booleano.

export async function GET() {
  const hasKey = !!(process.env.ANTHROPIC_API_KEY?.trim());
  return NextResponse.json({ ok: true, hasKey });
}
