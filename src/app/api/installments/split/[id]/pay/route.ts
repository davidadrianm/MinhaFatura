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

    // Busca o split de parcela garantindo que pertença ao usuário autenticado
    const split = await prisma.installmentSplit.findFirst({
      where: {
        id,
        installment: {
          userId: user.userId,
        },
      },
    });

    if (!split) {
      return NextResponse.json({ success: false, error: 'Divisão de parcela não encontrada' }, { status: 404 });
    }

    const newPaidStatus = !split.paid;

    // Alterna o status de pago e atualiza a data de recebimento
    const updated = await prisma.installmentSplit.update({
      where: { id },
      data: {
        paid: newPaidStatus,
        paidAt: newPaidStatus ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, paid: updated.paid, paidAt: updated.paidAt });
  } catch (error) {
    return errorResponse(error, 'Erro ao alternar pagamento da divisão');
  }
}
