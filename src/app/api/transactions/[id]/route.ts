import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { recalculateInvoiceAmount } from '@/lib/invoice-utils';

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

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.userId },
      include: {
        installments: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transação não encontrada' }, { status: 404 });
    }

    // Guarda os IDs das faturas afetadas pelas parcelas
    const affectedInvoiceIds = Array.from(
      new Set(
        transaction.installments
          .map((inst) => inst.invoiceId)
          .filter((id): id is string => !!id)
      )
    );

    // Deleta a transação (as parcelas serão deletadas em cascata conforme a relação onDelete: Cascade no banco)
    await prisma.transaction.delete({
      where: { id },
    });

    // Recalcula o valor de todas as faturas que continham parcelas desta transação
    for (const invoiceId of affectedInvoiceIds) {
      await recalculateInvoiceAmount(invoiceId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
