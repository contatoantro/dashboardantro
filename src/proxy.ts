import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Rotas públicas — não precisam de autenticação
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/cliente');   // links públicos de entrega para clientes

  if (isPublic) return NextResponse.next();

  // Se não autenticado, redireciona para login
  if (!req.auth) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Aplica o middleware em todas as rotas exceto _next/static, _next/image, favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
