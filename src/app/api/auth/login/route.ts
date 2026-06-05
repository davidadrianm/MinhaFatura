import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !comparePassword(password, user.password)) {
      return NextResponse.json(
        { success: false, error: 'E-mail ou senha inválidos' },
        { status: 400 }
      );
    }

    // Cria token de sessão
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set('session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
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
