import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { errorResponse, parseHexColor, requireString } from '@/lib/validation';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // Verifica propriedade da categoria
    const category = await prisma.category.findFirst({
      where: { id, userId: user.userId },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Categoria não encontrada' }, { status: 404 });
    }

    // Valida se há transações vinculadas a esta categoria para evitar exclusão em cascata acidental
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Não é possível excluir esta categoria. Existem ${transactionCount} transação(ões) vinculada(s) a ela. Por favor, re-categorize ou remova as transações primeiro.`
      }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Erro ao deletar categoria');
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    const { id } = await params;

    // Verifica propriedade da categoria
    const category = await prisma.category.findFirst({
      where: { id, userId: user.userId },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Categoria não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const name = requireString(body.name, 'Nome da categoria', 50);
    const color = parseHexColor(body.color, 'Cor', true) as string;

    const updated = await prisma.category.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    return errorResponse(error, 'Erro ao editar categoria');
  }
}
