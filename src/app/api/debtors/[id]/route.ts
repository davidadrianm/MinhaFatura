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

    const debtor = await prisma.debtor.findFirst({
      where: { id, userId: user.userId },
    });

    if (!debtor) {
      return NextResponse.json({ success: false, error: 'Devedor não encontrado' }, { status: 404 });
    }

    // Verifica se há transações vinculadas a este devedor
    const splitCount = await prisma.transactionSplit.count({
      where: { debtorId: id },
    });

    if (splitCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Não é possível excluir este devedor pois existem compras ativas vinculadas a ele.`
      }, { status: 400 });
    }

    await prisma.debtor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar devedor:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
