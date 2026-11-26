import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import {
  addPeriod,
  calculateInvoiceDate,
  createInstallmentsForTransaction,
  ensureRecurringTransactions,
  getOrCreateInvoice,
  recalculateInvoices,
  splitStatusFrom,
  TX_OPTIONS,
} from '@/lib/invoice-utils';
import { installmentShare, roundMoney } from '@/lib/money';
import { getUserPreferences } from '@/lib/user-preferences';
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
  ValidationError,
  type SplitInput,
} from '@/lib/validation';
import { assertOwnership } from '@/lib/ownership';
import { EDIT_SCOPES, MAX_INSTALLMENTS } from '@/lib/constants';

/** Multiplica (ou divide) os valores das divisões, arredondando para centavos. */
function scaleSplits(splits: SplitInput[], factor: number): SplitInput[] {
  return splits.map((s) => ({ debtorId: s.debtorId, amount: roundMoney(s.amount * factor) }));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    const { id } = await params;
    const body = await request.json();

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.userId },
      include: {
        installments: { include: { splits: true } },
        splits: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transação não encontrada' }, { status: 404 });
    }

    const description = requireString(body.description, 'Descrição', 200);
    const amountInput = parseMoney(body.amountTotal, 'Valor');
    const cardId = parseId(body.cardId, 'Cartão');
    const categoryId = parseId(body.categoryId, 'Categoria');
    const notes = parseString(body.notes, 'Observações', { max: 1000, required: false }) ?? null;
    const splitsInput = parseSplits(body.splits, amountInput);
    const purchaseDateInput = body.purchaseDate ? parseDateOnly(body.purchaseDate, 'Data da compra') : null;
    const isInstallmentLevelValues = body.isInstallmentLevelValues === true;

    const { card } = await assertOwnership(user.userId, {
      cardId,
      categoryId,
      debtorIds: splitsInput.map((s) => s.debtorId),
      allowInactiveCardId: transaction.cardId,
    });

    const isRecurring = transaction.recurrenceType !== 'none';
    const isInstallments = transaction.recurrenceType === 'installments';
    const isFixed = transaction.recurrenceType === 'fixed' || transaction.recurrenceType === 'fixed_ended';
    const period = transaction.recurrencePeriod || 'monthly';
    const dbStart = transaction.installmentStart || 1;
    const scope = isRecurring ? parseEnum(body.editScope, 'Escopo da edição', EDIT_SCOPES) : 'all';

    // Posição (em períodos) de uma parcela em relação à data base da transação.
    const stepsOf = (installmentNumber: number) => (isFixed ? installmentNumber - 1 : installmentNumber - dbStart);

    // ------------------------------------------------------------------ TODAS
    if (scope === 'all') {
      const newCount = isInstallments && body.installmentsCount !== undefined
        ? parseIntInRange(body.installmentsCount, 'Quantidade de parcelas', 1, MAX_INSTALLMENTS)
        : transaction.installmentsCount;
      const startInput = isInstallments && body.installmentStart !== undefined
        ? parseIntInRange(body.installmentStart, 'Parcela inicial', 1, newCount)
        : dbStart;
      if (dbStart > newCount) {
        throw new ValidationError('A quantidade de parcelas não pode ser menor que a parcela inicial');
      }

      let finalAmountTotal = amountInput;
      let finalSplits = splitsInput;
      if (isInstallmentLevelValues && isInstallments) {
        finalAmountTotal = roundMoney(amountInput * newCount);
        finalSplits = scaleSplits(splitsInput, newCount);
      }

      // Se o usuário mudou "qual parcela é esta", a data base da compra é recuada/avançada.
      let basePurchaseDate = purchaseDateInput ?? new Date(transaction.purchaseDate);
      if (isInstallments && startInput !== dbStart) {
        basePurchaseDate = addPeriod(basePurchaseDate, period, -(startInput - dbStart));
      }
      const newStart = dbStart;

      const sortedExisting = [...transaction.installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
      const loopStart = isFixed ? 1 : newStart;
      const loopEnd = isFixed ? sortedExisting.length : newCount;

      // Preferência do Perfil: qual parcela recebe os centavos que sobram na divisão.
      const { centRounding: rounding } = await getUserPreferences(user.userId);

      await prisma.$transaction(async (db) => {
        await db.transaction.update({
          where: { id },
          data: {
            description,
            categoryId,
            cardId,
            notes,
            amountTotal: finalAmountTotal,
            installmentsCount: newCount,
            installmentStart: newStart,
            purchaseDate: basePurchaseDate,
          },
        });

        await db.transactionSplit.deleteMany({ where: { transactionId: id } });
        if (finalSplits.length > 0) {
          await db.transactionSplit.createMany({
            data: finalSplits.map((s) => ({ transactionId: id, debtorId: s.debtorId, amount: s.amount })),
          });
        }

        const affectedInvoiceIds = new Set<string>();

        for (let i = loopStart; i <= loopEnd; i++) {
          const amount = isFixed ? finalAmountTotal : installmentShare(finalAmountTotal, newCount, i, rounding);
          const instDate = addPeriod(basePurchaseDate, period, isFixed ? i - 1 : i - newStart);
          const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
            instDate, card.closingDay, card.dueDay
          );
          const invoice = await getOrCreateInvoice(
            user.userId, cardId, referenceMonth, referenceYear, closingDate, dueDate, db
          );
          affectedInvoiceIds.add(invoice.id);
          const newStatus = invoice.status === 'paid' ? 'paid' : 'pending';

          const existing = sortedExisting[i - loopStart];
          let instId: string;
          let preserved = new Map<string, { paid: boolean; paidAt: Date | null }>();

          if (existing) {
            instId = existing.id;
            preserved = splitStatusFrom(existing.splits);
            if (existing.invoiceId) affectedInvoiceIds.add(existing.invoiceId);
            await db.transactionInstallment.update({
              where: { id: instId },
              data: {
                installmentNumber: i,
                amount,
                cardId,
                invoiceId: invoice.id,
                dueMonth: referenceMonth,
                dueYear: referenceYear,
                // Mantém o status se continuar na mesma fatura; se mudou de fatura, segue a fatura nova.
                status: existing.invoiceId === invoice.id ? existing.status : newStatus,
              },
            });
          } else {
            const created = await db.transactionInstallment.create({
              data: {
                userId: user.userId,
                cardId,
                transactionId: id,
                invoiceId: invoice.id,
                installmentNumber: i,
                amount,
                dueMonth: referenceMonth,
                dueYear: referenceYear,
                status: newStatus,
              },
            });
            instId = created.id;
          }

          // Recria as divisões preservando quem já pagou (antes, tudo voltava para "pendente").
          await db.installmentSplit.deleteMany({ where: { installmentId: instId } });
          if (finalSplits.length > 0) {
            await db.installmentSplit.createMany({
              data: finalSplits.map((split) => {
                const status = preserved.get(split.debtorId);
                return {
                  installmentId: instId,
                  debtorId: split.debtorId,
                  amount: isFixed ? split.amount : installmentShare(split.amount, newCount, i, rounding),
                  paid: status?.paid ?? false,
                  paidAt: status?.paidAt ?? null,
                };
              }),
            });
          }
        }

        // Remove parcelas que sobraram se a quantidade diminuiu.
        const expected = loopEnd - loopStart + 1;
        const toDelete = sortedExisting.slice(Math.max(expected, 0));
        for (const inst of toDelete) {
          if (inst.invoiceId) affectedInvoiceIds.add(inst.invoiceId);
        }
        if (toDelete.length > 0) {
          await db.transactionInstallment.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
        }

        await recalculateInvoices(affectedInvoiceIds, db);
      }, TX_OPTIONS);

      await ensureRecurringTransactions(user.userId, { force: true });
      return NextResponse.json({ success: true });
    }

    const selectedMonth = parseIntInRange(body.selectedMonth, 'Mês selecionado', 1, 12);
    const selectedYear = parseIntInRange(body.selectedYear, 'Ano selecionado', 2000, 2100);

    // ------------------------------------------------------------- SÓ ESTA
    if (scope === 'only_this') {
      const target = transaction.installments.find(
        (inst) => inst.dueMonth === selectedMonth && inst.dueYear === selectedYear
      );
      if (!target) {
        return NextResponse.json({ success: false, error: 'Parcela não encontrada para o mês selecionado' }, { status: 404 });
      }

      const instPurchaseDate = purchaseDateInput
        ?? addPeriod(transaction.purchaseDate, period, stepsOf(target.installmentNumber));

      let newAmount = amountInput;
      let newSplits = splitsInput;
      if (isInstallments && !isInstallmentLevelValues) {
        newAmount = roundMoney(amountInput / transaction.installmentsCount);
        newSplits = scaleSplits(splitsInput, 1 / transaction.installmentsCount);
      }

      await prisma.$transaction(async (db) => {
        const newTransaction = await db.transaction.create({
          data: {
            userId: user.userId,
            cardId,
            categoryId,
            description,
            purchaseDate: instPurchaseDate,
            amountTotal: newAmount,
            installmentsCount: 1,
            notes,
            recurrenceType: 'none',
            splits: newSplits.length > 0 ? { create: newSplits } : undefined,
          },
        });

        await createInstallmentsForTransaction(newTransaction.id, db, {
          preservedSplitStatus: [splitStatusFrom(target.splits)],
        });

        await db.transactionInstallment.delete({ where: { id: target.id } });
        if (target.invoiceId) await recalculateInvoices([target.invoiceId], db);

        const remaining = await db.transactionInstallment.count({ where: { transactionId: id } });
        if (remaining === 0) {
          await db.transaction.delete({ where: { id } });
        }
      }, TX_OPTIONS);

      await ensureRecurringTransactions(user.userId, { force: true });
      return NextResponse.json({ success: true });
    }

    // ------------------------------------------------------- DESTA EM DIANTE
    const future = transaction.installments
      .filter((inst) => inst.dueYear > selectedYear || (inst.dueYear === selectedYear && inst.dueMonth >= selectedMonth))
      .sort((a, b) => a.installmentNumber - b.installmentNumber);

    if (future.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhuma parcela futura encontrada' }, { status: 404 });
    }

    const first = future[0];
    const instPurchaseDate = purchaseDateInput ?? addPeriod(transaction.purchaseDate, period, stepsOf(first.installmentNumber));

    let newTxData: {
      amountTotal: number;
      installmentsCount: number;
      installmentStart: number;
      splits: SplitInput[];
      onlyNumbers?: Set<number>;
    };

    if (isInstallments) {
      // Mantém a semântica do app: amountTotal = valor da compra inteira e
      // installmentsCount = total de parcelas; a nova transação começa na parcela `first`.
      // (Antes, a contagem ficava menor que a parcela inicial e parcelas sumiam.)
      const totalCount = transaction.installmentsCount;
      const perInstallment = isInstallmentLevelValues ? amountInput : roundMoney(amountInput / totalCount);
      const perSplits = isInstallmentLevelValues ? splitsInput : scaleSplits(splitsInput, 1 / totalCount);
      newTxData = {
        amountTotal: roundMoney(perInstallment * totalCount),
        installmentsCount: totalCount,
        installmentStart: first.installmentNumber,
        splits: scaleSplits(perSplits, totalCount),
        // Só recria as parcelas que realmente estavam nesta transação.
        onlyNumbers: new Set(future.map((f) => f.installmentNumber)),
      };
    } else {
      // Assinatura ativa: janela padrão de 6 meses (ensureRecurring estende depois).
      // Assinatura já encerrada: recria só as parcelas que restavam, sem reativar.
      newTxData = {
        amountTotal: amountInput,
        installmentsCount: transaction.recurrenceType === 'fixed_ended' ? future.length : 6,
        installmentStart: 1,
        splits: splitsInput,
      };
    }

    await prisma.$transaction(async (db) => {
      const newTransaction = await db.transaction.create({
        data: {
          userId: user.userId,
          cardId,
          categoryId,
          description,
          purchaseDate: instPurchaseDate,
          amountTotal: newTxData.amountTotal,
          installmentsCount: newTxData.installmentsCount,
          notes,
          recurrenceType: transaction.recurrenceType,
          recurrencePeriod: period,
          installmentStart: newTxData.installmentStart,
          splits: newTxData.splits.length > 0 ? { create: newTxData.splits } : undefined,
        },
      });

      // Para recorrências fixas, as novas parcelas são numeradas de 1 em diante e
      // correspondem, na ordem, às parcelas futuras removidas.
      await createInstallmentsForTransaction(newTransaction.id, db, {
        onlyNumbers: newTxData.onlyNumbers,
        preservedSplitStatus: future.map((f) => splitStatusFrom(f.splits)),
      });

      await db.transactionInstallment.deleteMany({ where: { id: { in: future.map((f) => f.id) } } });

      if (isFixed) {
        await db.transaction.update({ where: { id }, data: { recurrenceType: 'fixed_ended' } });
      } else if (isInstallments) {
        const remaining = await db.transactionInstallment.count({ where: { transactionId: id } });
        if (remaining === 0) {
          await db.transaction.delete({ where: { id } });
        } else {
          // A transação antiga passa a ir da parcela inicial até a anterior à editada,
          // com valor total proporcional (para que edições futuras não inflem as parcelas).
          const keptCount = first.installmentNumber - 1;
          const ratio = keptCount / transaction.installmentsCount;
          await db.transaction.update({
            where: { id },
            data: {
              installmentsCount: keptCount,
              amountTotal: roundMoney(transaction.amountTotal * ratio),
            },
          });
          for (const split of transaction.splits) {
            await db.transactionSplit.update({
              where: { id: split.id },
              data: { amount: roundMoney(split.amount * ratio) },
            });
          }
        }
      }

      await recalculateInvoices(future.map((f) => f.invoiceId).filter((v): v is string => !!v), db);
    }, TX_OPTIONS);

    await ensureRecurringTransactions(user.userId, { force: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Erro ao editar transação');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all' or 'future'

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.userId },
      include: { installments: true },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transação não encontrada' }, { status: 404 });
    }

    if (type === 'future') {
      // "Excluir desta em diante" só faz sentido para assinaturas (recorrência fixa).
      if (transaction.recurrenceType !== 'fixed') {
        throw new ValidationError('A exclusão de parcelas futuras só está disponível para recorrências fixas');
      }
      const targetMonth = parseIntInRange(searchParams.get('month'), 'Mês', 1, 12);
      const targetYear = parseIntInRange(searchParams.get('year'), 'Ano', 2000, 2100);

      const futureInstallments = transaction.installments.filter(
        (inst) => inst.dueYear > targetYear || (inst.dueYear === targetYear && inst.dueMonth >= targetMonth)
      );

      await prisma.$transaction(async (db) => {
        await db.transactionInstallment.deleteMany({
          where: { id: { in: futureInstallments.map((i) => i.id) } },
        });
        // 'fixed_ended' impede que ensureRecurringTransactions gere novas parcelas.
        await db.transaction.update({ where: { id }, data: { recurrenceType: 'fixed_ended' } });
        await recalculateInvoices(futureInstallments.map((i) => i.invoiceId).filter((v): v is string => !!v), db);
      }, TX_OPTIONS);

      return NextResponse.json({ success: true });
    }

    await prisma.$transaction(async (db) => {
      // As parcelas são removidas em cascata.
      await db.transaction.delete({ where: { id } });
      await recalculateInvoices(transaction.installments.map((i) => i.invoiceId).filter((v): v is string => !!v), db);
    }, TX_OPTIONS);

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Erro ao deletar transação');
  }
}
