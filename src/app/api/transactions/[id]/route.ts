import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { recalculateInvoiceAmount, createInstallmentsForTransaction, ensureRecurringTransactions, calculateInvoiceDate, getOrCreateInvoice } from '@/lib/invoice-utils';

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
    const body = await request.json();
    const {
      description,
      amountTotal,
      cardId,
      categoryId,
      notes,
      splits, // array of { debtorId, amount }
      editScope, // 'only_this' | 'from_this_forward' | 'all'
      selectedMonth, // number
      selectedYear,  // number
      isInstallmentLevelValues,
      installmentsCount,
      installmentStart,
    } = body;

    if (!description || !amountTotal || !cardId || !categoryId) {
      return NextResponse.json({ success: false, error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // Find the original transaction
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.userId },
      include: {
        installments: {
          include: {
            splits: true,
          }
        },
        splits: true,
      }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transação não encontrada' }, { status: 404 });
    }

    const newAmountVal = parseFloat(amountTotal);
    const isRecurring = transaction.recurrenceType !== 'none';
    const finalScope = isRecurring ? editScope : 'all';

    if (finalScope === 'all') {
      const newCount = (transaction.recurrenceType === 'installments' && installmentsCount !== undefined) ? installmentsCount : transaction.installmentsCount;
      const newStart = (transaction.recurrenceType === 'installments' && installmentStart !== undefined) ? installmentStart : transaction.installmentStart;

      let finalAmountTotal = newAmountVal;
      let finalSplits = splits;

      if (isInstallmentLevelValues && transaction.recurrenceType === 'installments') {
        finalAmountTotal = newAmountVal * newCount;
        if (splits && splits.length > 0) {
          finalSplits = splits.map((s: any) => ({
            ...s,
            amount: parseFloat(s.amount) * newCount,
          }));
        }
      }

      // 1. Update the parent transaction attributes
      await prisma.transaction.update({
        where: { id },
        data: {
          description,
          categoryId,
          cardId,
          notes,
          amountTotal: finalAmountTotal,
          installmentsCount: newCount,
          installmentStart: newStart,
        }
      });

      // Update splits on transaction level
      await prisma.transactionSplit.deleteMany({
        where: { transactionId: id }
      });
      if (finalSplits && finalSplits.length > 0) {
        await prisma.transactionSplit.createMany({
          data: finalSplits.map((s: any) => ({
            transactionId: id,
            debtorId: s.debtorId,
            amount: parseFloat(s.amount),
          }))
        });
      }

      // 2. Update all installments
      const sortedExistingInstallments = [...transaction.installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
      const isFixed = transaction.recurrenceType === 'fixed' || transaction.recurrenceType === 'fixed_ended';
      const count = isFixed ? sortedExistingInstallments.length : newCount;

      const baseAmount = isFixed
        ? finalAmountTotal
        : Math.round((finalAmountTotal / count) * 100) / 100;
      const lastAmount = isFixed
        ? finalAmountTotal
        : Math.round((finalAmountTotal - (baseAmount * (count - 1))) * 100) / 100;

      const affectedInvoiceIds = new Set<string>();

      // Get credit card details once to avoid querying in a loop
      const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
      if (!card) {
        return NextResponse.json({ success: false, error: 'Cartão não encontrado' }, { status: 404 });
      }

      for (let i = 1; i <= count; i++) {
        const isLast = i === count;
        const installmentAmount = isLast ? lastAmount : baseAmount;
        const currentInstallmentNumber = isFixed
          ? (sortedExistingInstallments[i - 1]?.installmentNumber || i)
          : (newStart + (i - 1));

        // Calculate reference date for this installment
        const instPurchaseDate = new Date(transaction.purchaseDate);
        if (transaction.recurrencePeriod === 'daily') {
          instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1));
        } else if (transaction.recurrencePeriod === 'weekly') {
          instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1) * 7);
        } else if (transaction.recurrencePeriod === 'biweekly') {
          instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1) * 15);
        } else { // monthly
          instPurchaseDate.setUTCMonth(transaction.purchaseDate.getUTCMonth() + (i - 1));
        }

        const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
          instPurchaseDate,
          card.closingDay,
          card.dueDay
        );

        const newInvoice = await getOrCreateInvoice(
          user.userId,
          cardId,
          referenceMonth,
          referenceYear,
          closingDate,
          dueDate
        );
        const newInvoiceId = newInvoice.id;
        affectedInvoiceIds.add(newInvoiceId);

        // Find or create database installment
        let instId: string;
        if (i <= sortedExistingInstallments.length) {
          const existingInst = sortedExistingInstallments[i - 1];
          instId = existingInst.id;
          if (existingInst.invoiceId) {
            affectedInvoiceIds.add(existingInst.invoiceId);
          }

          await prisma.transactionInstallment.update({
            where: { id: instId },
            data: {
              installmentNumber: currentInstallmentNumber,
              amount: installmentAmount,
              cardId,
              invoiceId: newInvoiceId,
              dueMonth: referenceMonth,
              dueYear: referenceYear,
            }
          });
        } else {
          const newInst = await prisma.transactionInstallment.create({
            data: {
              userId: user.userId,
              cardId,
              transactionId: id,
              invoiceId: newInvoiceId,
              installmentNumber: currentInstallmentNumber,
              amount: installmentAmount,
              dueMonth: referenceMonth,
              dueYear: referenceYear,
              status: newInvoice.status === 'paid' ? 'paid' : 'pending',
            }
          });
          instId = newInst.id;
        }

        // Update splits for this installment
        await prisma.installmentSplit.deleteMany({
          where: { installmentId: instId }
        });

        if (finalSplits && finalSplits.length > 0) {
          for (const split of finalSplits) {
            const baseSplitAmount = isFixed
              ? parseFloat(split.amount)
              : Math.round((parseFloat(split.amount) / count) * 100) / 100;
            const lastSplitAmount = isFixed
              ? parseFloat(split.amount)
              : Math.round((parseFloat(split.amount) - (baseSplitAmount * (count - 1))) * 100) / 100;
            const splitAmount = (i === count) ? lastSplitAmount : baseSplitAmount;

            await prisma.installmentSplit.create({
              data: {
                installmentId: instId,
                debtorId: split.debtorId,
                amount: splitAmount,
                paid: false,
              }
            });
          }
        }
      }

      // Delete extra installments if count has decreased
      if (sortedExistingInstallments.length > count) {
        const toDelete = sortedExistingInstallments.slice(count);
        for (const inst of toDelete) {
          if (inst.invoiceId) {
            affectedInvoiceIds.add(inst.invoiceId);
          }
          await prisma.transactionInstallment.delete({
            where: { id: inst.id }
          });
        }
      }

      for (const invoiceId of affectedInvoiceIds) {
        await recalculateInvoiceAmount(invoiceId);
      }

      await ensureRecurringTransactions(user.userId);

      return NextResponse.json({ success: true });
    }

    if (finalScope === 'only_this') {
      const targetInstallment = transaction.installments.find(
        (inst) => inst.dueMonth === selectedMonth && inst.dueYear === selectedYear
      );

      if (!targetInstallment) {
        return NextResponse.json({ success: false, error: 'Parcela não encontrada para o mês selecionado' }, { status: 404 });
      }

      const i = targetInstallment.installmentNumber - transaction.installmentStart + 1;
      const instPurchaseDate = new Date(transaction.purchaseDate);
      if (transaction.recurrencePeriod === 'daily') {
        instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1));
      } else if (transaction.recurrencePeriod === 'weekly') {
        instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1) * 7);
      } else if (transaction.recurrencePeriod === 'biweekly') {
        instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1) * 15);
      } else {
        instPurchaseDate.setUTCMonth(transaction.purchaseDate.getUTCMonth() + (i - 1));
      }

      let newTxAmountTotal = newAmountVal;
      let newTxSplits = splits;

      if (transaction.recurrenceType === 'installments') {
        newTxAmountTotal = isInstallmentLevelValues
          ? newAmountVal
          : (newAmountVal / transaction.installmentsCount);

        if (splits && splits.length > 0) {
          newTxSplits = splits.map((s: any) => ({
            debtorId: s.debtorId,
            amount: isInstallmentLevelValues
              ? parseFloat(s.amount)
              : (parseFloat(s.amount) / transaction.installmentsCount),
          }));
        }
      }

      const newTransaction = await prisma.transaction.create({
        data: {
          userId: user.userId,
          cardId,
          categoryId,
          description,
          purchaseDate: instPurchaseDate,
          amountTotal: newTxAmountTotal,
          installmentsCount: 1,
          notes,
          recurrenceType: 'none',
          splits: newTxSplits && newTxSplits.length > 0 ? {
            create: newTxSplits.map((s: any) => ({
              debtorId: s.debtorId,
              amount: parseFloat(s.amount),
            }))
          } : undefined,
        }
      });

      await createInstallmentsForTransaction(newTransaction.id);

      const oldInvoiceId = targetInstallment.invoiceId;

      await prisma.transactionInstallment.delete({
        where: { id: targetInstallment.id }
      });

      if (oldInvoiceId) {
        await recalculateInvoiceAmount(oldInvoiceId);
      }

      const remainingInstallmentsCount = await prisma.transactionInstallment.count({
        where: { transactionId: id }
      });
      if (remainingInstallmentsCount === 0) {
        await prisma.transaction.delete({ where: { id } });
      }

      await ensureRecurringTransactions(user.userId);

      return NextResponse.json({ success: true });
    }

    if (finalScope === 'from_this_forward') {
      const futureInstallments = transaction.installments.filter((inst) => {
        return (inst.dueYear > selectedYear) || (inst.dueYear === selectedYear && inst.dueMonth >= selectedMonth);
      }).sort((a, b) => a.installmentNumber - b.installmentNumber);

      if (futureInstallments.length === 0) {
        return NextResponse.json({ success: false, error: 'Nenhuma parcela futura encontrada' }, { status: 404 });
      }

      const firstFutureInst = futureInstallments[0];

      const i = firstFutureInst.installmentNumber - transaction.installmentStart + 1;
      const instPurchaseDate = new Date(transaction.purchaseDate);
      if (transaction.recurrencePeriod === 'daily') {
        instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1));
      } else if (transaction.recurrencePeriod === 'weekly') {
        instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1) * 7);
      } else if (transaction.recurrencePeriod === 'biweekly') {
        instPurchaseDate.setUTCDate(transaction.purchaseDate.getUTCDate() + (i - 1) * 15);
      } else {
        instPurchaseDate.setUTCMonth(transaction.purchaseDate.getUTCMonth() + (i - 1));
      }

      let newTxAmountTotal = newAmountVal;
      let newTxSplits = splits;

      if (transaction.recurrenceType === 'installments') {
        const instCount = futureInstallments.length;
        const installmentAmount = isInstallmentLevelValues
          ? newAmountVal
          : (newAmountVal / transaction.installmentsCount);
        newTxAmountTotal = installmentAmount * instCount;

        if (splits && splits.length > 0) {
          newTxSplits = splits.map((s: any) => ({
            debtorId: s.debtorId,
            amount: isInstallmentLevelValues
              ? parseFloat(s.amount) * instCount
              : (parseFloat(s.amount) / transaction.installmentsCount) * instCount,
          }));
        }
      }

      const newTransaction = await prisma.transaction.create({
        data: {
          userId: user.userId,
          cardId,
          categoryId,
          description,
          purchaseDate: instPurchaseDate,
          amountTotal: newTxAmountTotal,
          installmentsCount: transaction.recurrenceType === 'fixed' ? 12 : futureInstallments.length,
          notes,
          recurrenceType: transaction.recurrenceType,
          recurrencePeriod: transaction.recurrencePeriod,
          installmentStart: firstFutureInst.installmentNumber,
          splits: newTxSplits && newTxSplits.length > 0 ? {
            create: newTxSplits.map((s: any) => ({
              debtorId: s.debtorId,
              amount: parseFloat(s.amount),
            }))
          } : undefined,
        }
      });

      await createInstallmentsForTransaction(newTransaction.id);

      const affectedInvoiceIds = Array.from(
        new Set(
          futureInstallments
            .map((inst) => inst.invoiceId)
            .filter((id): id is string => !!id)
        )
      );

      const futureInstallmentIds = futureInstallments.map((inst) => inst.id);
      await prisma.transactionInstallment.deleteMany({
        where: { id: { in: futureInstallmentIds } }
      });

      if (transaction.recurrenceType === 'fixed') {
        await prisma.transaction.update({
          where: { id },
          data: { recurrenceType: 'fixed_ended' }
        });
      } else if (transaction.recurrenceType === 'installments') {
        const remainingCount = transaction.installmentsCount - futureInstallments.length;
        if (remainingCount <= 0) {
          await prisma.transaction.delete({ where: { id } });
        } else {
          await prisma.transaction.update({
            where: { id },
            data: { installmentsCount: remainingCount }
          });
        }
      }

      for (const invoiceId of affectedInvoiceIds) {
        await recalculateInvoiceAmount(invoiceId);
      }

      await ensureRecurringTransactions(user.userId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Ação não suportada' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao editar transação:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}

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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all' or 'future'
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: user.userId },
      include: {
        installments: true
      }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transação não encontrada' }, { status: 404 });
    }

    if (type === 'future' && monthStr && yearStr) {
      const targetMonth = parseInt(monthStr);
      const targetYear = parseInt(yearStr);

      // Busca as parcelas que vencem no mês/ano alvo em diante
      const futureInstallments = transaction.installments.filter((inst) => {
        return (inst.dueYear > targetYear) || (inst.dueYear === targetYear && inst.dueMonth >= targetMonth);
      });

      const affectedInvoiceIds = Array.from(
        new Set(
          futureInstallments
            .map((inst) => inst.invoiceId)
            .filter((id): id is string => !!id)
        )
      );

      const futureInstallmentIds = futureInstallments.map((inst) => inst.id);

      // Deleta as parcelas futuras (splits e devedores serão apagados em cascata)
      await prisma.transactionInstallment.deleteMany({
        where: {
          id: { in: futureInstallmentIds }
        }
      });

      // Altera o tipo de recorrência para 'fixed_ended' para que o ensureRecurringTransactions não gere novas parcelas futuras
      await prisma.transaction.update({
        where: { id },
        data: { recurrenceType: 'fixed_ended' }
      });

      // Recalcula o valor de todas as faturas afetadas
      for (const invoiceId of affectedInvoiceIds) {
        await recalculateInvoiceAmount(invoiceId);
      }

      return NextResponse.json({ success: true });
    }

    // Guarda os IDs das faturas afetadas pelas parcelas (deleção completa de tudo)
    const affectedInvoiceIds = Array.from(
      new Set(
        transaction.installments
          .map((inst) => inst.invoiceId)
          .filter((id): id is string => !!id)
      )
    );

    // Deleta a transação (as parcelas serão deletadas em cascata conforme a relação onDelete: Cascade no banco)
    await prisma.transaction.delete({
      where: { id },
    });

    // Recalcula o valor de todas as faturas que continham parcelas desta transação
    for (const invoiceId of affectedInvoiceIds) {
      await recalculateInvoiceAmount(invoiceId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 });
  }
}
