import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/validation';
import { getInvoiceStatus } from '@/lib/invoice-utils';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: user.userId },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Fatura não encontrada' }, { status: 404 });
    }

    // Determina o status correto com base na data atual (no fuso do app)
    const correctStatus = getInvoiceStatus({ ...invoice, status: 'open', paidAt: null });

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: correctStatus, paidAt: null },
      }),
      prisma.transactionInstallment.updateMany({
        where: { invoiceId: id },
        data: { status: 'pending' },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Erro ao estornar pagamento da fatura');
  }
}
