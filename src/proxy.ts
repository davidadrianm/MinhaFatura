import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session-token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/';
  
  // Rotas que exigem login
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/cards') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/categories');

  // APIs que exigem login (exceto login/cadastro)
  const isProtectedApi =
    pathname.startsWith('/api') &&
    !pathname.startsWith('/api/auth/login') &&
    !pathname.startsWith('/api/auth/register');

  const payload = token ? verifyToken(token) : null;
  const isAuthenticated = !!payload;

  if (isProtectedRoute && !isAuthenticated) {
    // Redireciona para o Login
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isProtectedApi && !isAuthenticated) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Não autorizado' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  if (isAuthRoute && isAuthenticated) {
    // Se logado e acessa o login, manda pro Dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};
