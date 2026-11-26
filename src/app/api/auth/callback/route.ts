import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/user-record';

/**
 * Aceita apenas caminhos internos (ex.: "/dashboard").
 * Bloqueia "//site.com", "/\\site.com" e "@site.com", que permitiam redirecionar para fora do app.
 */
function safeNextPath(value: string | null, origin: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) {
    return '/dashboard';
  }
  // Confirmação final: depois de normalizado pelo parser de URL, o destino tem que ser a mesma origem.
  const url = new URL(value, origin);
  return url.origin === origin ? `${url.pathname}${url.search}` : '/dashboard';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), origin);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Login com Google não passava pelo /register: garante a linha em User + categorias padrão.
      if (data.user) await ensureUserRecord(data.user);

      // Sempre redireciona para a própria origem do app; o cabeçalho x-forwarded-host
      // pode ser manipulado e não é usado para montar a URL de destino.
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL('/?error=Erro ao autenticar com o Google', origin));
}
