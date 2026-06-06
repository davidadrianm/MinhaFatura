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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all' or 'future'
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.userId },
      include: {
        installments: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transação não encontrada' }, { status: 404 });
    }

    if (type === 'future' && monthStr && yearStr) {
      const targetMonth = parseInt(monthStr);
      const targetYear = parseInt(yearStr);

      // Busca as parcelas que vencem no mês/ano alvo em diante
      const futureInstallments = transaction.installments.filter((inst) => {
        return (inst.dueYear > targetYear) || (inst.dueYear === targetYear && inst.dueMonth >= targetMonth);
      });

      const affectedInvoiceIds = Array.from(
        new Set(
          futureInstallments
            .map((inst) => inst.invoiceId)
            .filter((id): id is string => !!id)
        )
      );

      const futureInstallmentIds = futureInstallments.map((inst) => inst.id);

      // Deleta as parcelas futuras (splits e devedores serão apagados em cascata)
      await prisma.transactionInstallment.deleteMany({
        where: {
          id: { in: futureInstallmentIds }
        }
      });

      // Altera o tipo de recorrência para 'fixed_ended' para que o ensureRecurringTransactions não gere novas parcelas futuras
      await prisma.transaction.update({
        where: { id },
        data: { recurrenceType: 'fixed_ended' }
      });

      // Recalcula o valor de todas as faturas afetadas
      for (const invoiceId of affectedInvoiceIds) {
        await recalculateInvoiceAmount(invoiceId);
      }

      return NextResponse.json({ success: true });
    }

    // Guarda os IDs das faturas afetadas pelas parcelas (deleção completa de tudo)
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
