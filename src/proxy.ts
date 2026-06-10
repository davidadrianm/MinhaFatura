import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/';
  
  // Rotas que exigem login
  const isProtectedRoute = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/cards') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/categories');

  // APIs que exigem login (exceto login/cadastro/callback)
  const isProtectedApi =
    pathname.startsWith('/api') &&
    !pathname.startsWith('/api/auth/login') &&
    !pathname.startsWith('/api/auth/register') &&
    !pathname.startsWith('/api/auth/callback');

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

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

  return response;
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
