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

    // Verifica se o cartão pertence ao usuário
    const card = await prisma.creditCard.findFirst({
      where: { id, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json({ success: false, error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Verifica se o cartão está em uso (parcelas pendentes ou faturas não pagas)
    const activeInstallmentsCount = await prisma.transactionInstallment.count({
      where: {
        cardId: id,
        OR: [
          { status: 'pending' },
          { invoice: { status: { in: ['open', 'closed', 'overdue'] } } }
        ]
      }
    });

    // Verifica se o cartão tem splits de devedores não pagos
    const activeSplitsCount = await prisma.installmentSplit.count({
      where: {
        paid: false,
        installment: { cardId: id }
      }
    });

    // Verifica se há faturas não pagas ligadas ao cartão
    const activeInvoicesCount = await prisma.invoice.count({
      where: {
        cardId: id,
        status: { in: ['open', 'closed', 'overdue'] }
      }
    });

    if (activeInstallmentsCount > 0 || activeSplitsCount > 0 || activeInvoicesCount > 0) {
      return NextResponse.json({
        success: false,
        error: 'Não é possível arquivar o cartão pois ele possui faturas abertas/fechadas, parcelas pendentes ou reembolsos de devedores pendentes.'
      }, { status: 400 });
    }

    // Apenas arquiva o cartão (isActive = false)
    await prisma.creditCard.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao arquivar cartão:', error);
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

    // Verifica se o cartão pertence ao usuário
    const card = await prisma.creditCard.findFirst({
      where: { id, userId: user.userId },
    });

    if (!card) {
      return NextResponse.json({ success: false, error: 'Cartão não encontrado' }, { status: 404 });
    }

    const { name, bankName, brand, limit, closingDay, dueDay, color } = await request.json();

    if (!name || !bankName || !brand || limit === undefined || closingDay === undefined || dueDay === undefined) {
      return NextResponse.json({ success: false, error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const closingDayInt = parseInt(closingDay);
    const dueDayInt = parseInt(dueDay);

    if (closingDayInt < 1 || closingDayInt > 31 || dueDayInt < 1 || dueDayInt > 31) {
      return NextResponse.json({ success: false, error: 'Os dias de fechamento e vencimento devem ser entre 1 e 31' }, { status: 400 });
    }

    const updatedCard = await prisma.creditCard.update({
      where: { id },
      data: {
        name,
        bankName,
        brand,
        limit: parseFloat(limit),
        closingDay: closingDayInt,
        dueDay: dueDayInt,
        color: color || undefined,
      },
    });

    return NextResponse.json({ success: true, card: updatedCard });
  } catch (error) {
    console.error('Erro ao atualizar cartão:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}

