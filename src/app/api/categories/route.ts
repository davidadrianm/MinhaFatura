import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { errorResponse, parseHexColor, requireString } from '@/lib/validation';

export async function GET() {
  try {
    const user = await requireUser();

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
    return errorResponse(error, 'Erro ao buscar categorias');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body = await request.json();
    const name = requireString(body.name, 'Nome da categoria', 50);
    const color = parseHexColor(body.color, 'Cor', true) as string;

    const category = await prisma.category.create({
      data: {
        userId: user.userId,
        name,
        color,
      }
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    return errorResponse(error, 'Erro ao criar categoria');
  }
}
