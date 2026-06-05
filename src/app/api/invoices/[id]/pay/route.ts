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

    // Atualiza a fatura para "paid" e grava a data de pagamento
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
      },
    });

    // Atualiza todas as parcelas associadas a esta fatura para "paid"
    await prisma.transactionInstallment.updateMany({
      where: { invoiceId: id },
      data: {
        status: 'paid',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao pagar fatura:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
