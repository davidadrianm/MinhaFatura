import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Preencha todos os campos obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este e-mail já está em uso' },
        { status: 400 }
      );
    }

    // Cria o usuário
    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Cria algumas categorias padrão para o usuário recém-criado
    const defaultCategories = [
      { name: 'Mercado', color: '#10b981' }, // Verde emerald-500
      { name: 'Combustível', color: '#f59e0b' }, // Amarelo amber-500
      { name: 'Lazer', color: '#ec4899' }, // Rosa pink-500
      { name: 'Assinaturas & Serviços', color: '#3b82f6' }, // Azul blue-500
      { name: 'Restaurante / Alimentação', color: '#ef4444' }, // Vermelho red-500
      { name: 'Outros', color: '#71717a' }, // Gray zinc-500
    ];

    await prisma.category.createMany({
      data: defaultCategories.map((cat) => ({
        name: cat.name,
        color: cat.color,
        userId: user.id,
      })),
    });

    // Cria token de sessão
    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // Resposta com cookie seguro
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
  } catch (error: any) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro interno do servidor' },
      { status: 500 }
    );
  }
}
