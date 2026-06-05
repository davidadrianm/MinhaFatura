import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const debtors = await prisma.debtor.findMany({
      where: { userId: user.userId },
      include: {
        installmentSplits: {
          select: {
            amount: true,
            paid: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Mapeia para calcular o total pendente de cada devedor
    const mappedDebtors = debtors.map((debtor) => {
      const pendingAmount = debtor.installmentSplits
        .filter((split) => !split.paid)
        .reduce((sum, split) => sum + split.amount, 0);

      const totalAmount = debtor.installmentSplits
        .reduce((sum, split) => sum + split.amount, 0);

      return {
        id: debtor.id,
        name: debtor.name,
        pendingAmount,
        totalAmount,
        installmentsCount: debtor.installmentSplits.length
      };
    });

    return NextResponse.json({ success: true, debtors: mappedDebtors });
  } catch (error) {
    console.error('Erro ao buscar devedores:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nome do devedor é obrigatório' }, { status: 400 });
    }

    const debtor = await prisma.debtor.create({
      data: {
        userId: user.userId,
        name,
      }
    });

    return NextResponse.json({ success: true, debtor });
  } catch (error) {
    console.error('Erro ao criar devedor:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
