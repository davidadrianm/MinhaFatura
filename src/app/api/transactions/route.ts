import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { createInstallmentsForTransaction } from '@/lib/invoice-utils';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: user.userId,
        cardId: cardId !== 'all' ? cardId : undefined,
        categoryId: categoryId !== 'all' ? categoryId : undefined,
      },
      include: {
        card: true,
        category: true,
        installments: {
          include: {
            splits: {
              include: {
                debtor: true
              }
            }
          },
          orderBy: {
            installmentNumber: 'asc',
          }
        },
        splits: {
          include: {
            debtor: true,
          }
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { 
      description, 
      purchaseDate, 
      amountTotal, 
      installmentsCount, 
      cardId, 
      categoryId, 
      notes, 
      splits,
      recurrenceType = 'none',
      recurrencePeriod = 'monthly',
      installmentStart = 1
    } = await request.json();

    if (!description || !purchaseDate || !amountTotal || !installmentsCount || !cardId || !categoryId) {
      return NextResponse.json({ success: false, error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    const totalAmount = parseFloat(amountTotal);

    // Valida se a soma dos splits não ultrapassa o valor total da transação
    if (splits && splits.length > 0) {
      const splitsSum = splits.reduce((sum: number, split: any) => sum + parseFloat(split.amount), 0);
      if (splitsSum > totalAmount) {
        return NextResponse.json({ success: false, error: 'A soma das divisões não pode exceder o valor total da compra' }, { status: 400 });
      }
    }

    // Cria a transação com splits (se houver)
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.userId,
        cardId,
        categoryId,
        description,
        // Parse the date string as noon UTC to avoid timezone-induced date rollback.
        // e.g. "2026-06-04" at midnight UTC = 2026-06-03 20:00 local (UTC-4) → wrong month.
        // Using noon UTC guarantees no timezone can shift it to the previous calendar day.
        purchaseDate: new Date(`${purchaseDate}T12:00:00.000Z`),

        amountTotal: totalAmount,
        installmentsCount: parseInt(installmentsCount),
        notes,
        recurrenceType,
        recurrencePeriod,
        installmentStart: parseInt(installmentStart.toString()),
        splits: splits && splits.length > 0 ? {
          create: splits.map((s: any) => ({
            debtorId: s.debtorId,
            amount: parseFloat(s.amount),
          }))
        } : undefined,
      },
    });

    // Gera as parcelas e atualiza faturas
    await createInstallmentsForTransaction(transaction.id);

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Erro ao criar transação:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno' }, { status: 500 });
  }
}
