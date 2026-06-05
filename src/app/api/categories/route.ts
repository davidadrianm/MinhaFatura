import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.userId },
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json({ success: false, error: 'Preencha o nome e selecione uma cor' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        userId: user.userId,
        name,
        color,
      }
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
