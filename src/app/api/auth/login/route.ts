import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: 'E-mail ou senha inválidos' },
        { status: 400 }
      );
    }

    // Busca o tema do usuário no banco local
    const dbUser = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { theme: true, name: true },
    });

    const name = dbUser?.name || data.user.user_metadata?.name || 'Usuário';
    const theme = dbUser?.theme || 'light';

    const response = NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email, name },
    });

    response.cookies.set('theme', theme, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 ano
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro interno do servidor' },
      { status: 500 }
    );
  }
}
