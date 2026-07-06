import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: user.userId },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Determina o status correto com base na data atual
    const now = new Date();
    let correctStatus = 'open';
    if (new Date(invoice.dueDate) < now) {
      correctStatus = 'overdue';
    } else if (new Date(invoice.closingDate) < now) {
      correctStatus = 'closed';
    }

    // Atualiza a fatura
    await prisma.invoice.update({
      where: { id },
      data: {
        status: correctStatus,
        paidAt: null,
      },
    });

    // Atualiza todas as parcelas associadas de volta para "pending"
    await prisma.transactionInstallment.updateMany({
      where: { invoiceId: id },
      data: {
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao estornar pagamento da fatura:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
