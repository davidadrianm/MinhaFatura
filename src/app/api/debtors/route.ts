import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { errorResponse } from '@/lib/validation';
import { sumMoney } from '@/lib/money';

export async function GET() {
  try {
    const user = await requireUser();

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
      const pendingAmount = sumMoney(
        debtor.installmentSplits.filter((split) => !split.paid).map((split) => split.amount)
      );

      const totalAmount = sumMoney(debtor.installmentSplits.map((split) => split.amount));

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
    return errorResponse(error, 'Erro ao buscar devedores');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const { name: rawName } = await request.json();
    const name = typeof rawName === 'string' ? rawName.trim() : '';

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nome do devedor é obrigatório' }, { status: 400 });
    }
    if (name.length > 80) {
      return NextResponse.json({ success: false, error: 'O nome deve ter no máximo 80 caracteres' }, { status: 400 });
    }

    const debtor = await prisma.debtor.create({
      data: {
        userId: user.userId,
        name,
      }
    });

    return NextResponse.json({ success: true, debtor });
  } catch (error) {
    return errorResponse(error, 'Erro ao criar devedor');
  }
}
