// src/lib/require-auth.ts
// Verifica se o request tem sessão válida.
// Uso: const unauth = await requireAuth(); if (unauth) return unauth;
//
// Retorna NextResponse 401 se não autenticado, null se ok.

import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Não autenticado. Faça login para continuar.' },
      { status: 401 }
    );
  }
  return null;
}
