import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

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
    console.error('Erro ao deletar categoria:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verifica propriedade da categoria
    const category = await prisma.category.findFirst({
      where: { id, userId: user.userId },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: 'Categoria não encontrada' }, { status: 404 });
    }

    const { name, color } = await request.json();

    if (!name || !color) {
      return NextResponse.json({ success: false, error: 'Preencha o nome e selecione uma cor' }, { status: 400 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error('Erro ao editar categoria:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
