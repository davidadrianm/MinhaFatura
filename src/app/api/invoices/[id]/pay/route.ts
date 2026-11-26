import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/validation';

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

    // Fatura e parcelas são marcadas como pagas juntas (ou nada muda, se falhar)
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: 'paid', paidAt: new Date() },
      }),
      prisma.transactionInstallment.updateMany({
        where: { invoiceId: id },
        data: { status: 'paid' },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Erro ao pagar fatura');
  }
}
