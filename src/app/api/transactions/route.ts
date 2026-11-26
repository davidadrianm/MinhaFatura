import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { createInstallmentsForTransaction, ensureRecurringTransactions, TX_OPTIONS } from '@/lib/invoice-utils';
import {
  errorResponse,
  parseDateOnly,
  parseEnum,
  parseId,
  parseIntInRange,
  parseMoney,
  parseSplits,
  parseString,
  requireString,
} from '@/lib/validation';
import { assertOwnership } from '@/lib/ownership';
import { MAX_INSTALLMENTS, RECURRENCE_PERIODS, RECURRENCE_TYPES } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const user = await requireUser();

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
    return errorResponse(error, 'Erro ao buscar transações');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body = await request.json();

    const description = requireString(body.description, 'Descrição', 200);
    const purchaseDate = parseDateOnly(body.purchaseDate, 'Data da compra');
    const amountTotal = parseMoney(body.amountTotal, 'Valor total');
    const cardId = parseId(body.cardId, 'Cartão');
    const categoryId = parseId(body.categoryId, 'Categoria');
    const notes = parseString(body.notes, 'Observações', { max: 1000, required: false }) ?? null;
    const recurrenceType = parseEnum(body.recurrenceType, 'Tipo de recorrência', RECURRENCE_TYPES, 'none');
    const recurrencePeriod = parseEnum(body.recurrencePeriod, 'Período de recorrência', RECURRENCE_PERIODS, 'monthly');

    let installmentsCount = 1;
    let installmentStart = 1;
    if (recurrenceType === 'installments') {
      installmentsCount = parseIntInRange(body.installmentsCount, 'Quantidade de parcelas', 1, MAX_INSTALLMENTS);
      installmentStart = body.installmentStart === undefined
        ? 1
        : parseIntInRange(body.installmentStart, 'Parcela inicial', 1, installmentsCount);
    } else if (recurrenceType === 'fixed') {
      installmentsCount = parseIntInRange(body.installmentsCount ?? 6, 'Quantidade de meses', 1, 24);
    }

    const splits = parseSplits(body.splits, amountTotal);

    await assertOwnership(user.userId, {
      cardId,
      categoryId,
      debtorIds: splits.map((s) => s.debtorId),
    });

    const transaction = await prisma.$transaction(async (db) => {
      const created = await db.transaction.create({
        data: {
          userId: user.userId,
          cardId,
          categoryId,
          description,
          purchaseDate,
          amountTotal,
          installmentsCount,
          notes,
          recurrenceType,
          recurrencePeriod,
          installmentStart,
          splits: splits.length > 0 ? { create: splits } : undefined,
        },
      });
      await createInstallmentsForTransaction(created.id, db);
      return created;
    }, TX_OPTIONS);

    if (recurrenceType === 'fixed') {
      await ensureRecurringTransactions(user.userId, { force: true });
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    return errorResponse(error, 'Erro ao criar transação');
  }
}
