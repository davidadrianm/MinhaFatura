import { prisma } from './prisma';

interface InvoiceDetails {
  referenceMonth: number;
  referenceYear: number;
  closingDate: Date;
  dueDate: Date;
}

/**
 * Calcula os detalhes da fatura para uma data de compra específica,
 * baseado no dia de fechamento e dia de vencimento do cartão.
 */
export function calculateInvoiceDate(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number
): InvoiceDetails {
  // Use UTC methods to avoid timezone-shifting the calendar date.
  // e.g. new Date("2026-06-04") is midnight UTC; local getMonth() on UTC-4
  // returns May (4) instead of June (5), causing wrong invoice assignment.
  const year = purchaseDate.getUTCFullYear();
  const month = purchaseDate.getUTCMonth(); // 0-indexed

  // Closing date for the purchase month (UTC)
  const closingThisMonth = new Date(Date.UTC(year, month, closingDay, 23, 59, 59, 999));

  let refMonth = month + 1; // 1-indexed (Jan = 1)
  let refYear = year;

  // If the purchase date is after this month's closing, roll forward to next month
  if (purchaseDate > closingThisMonth) {
    refMonth += 1;
    if (refMonth > 12) {
      refMonth = 1;
      refYear += 1;
    }
  }

  // Final closing date (UTC)
  const closingDate = new Date(Date.UTC(refYear, refMonth - 1, closingDay, 23, 59, 59, 999));

  // Due date: if dueDay <= closingDay, due falls in the month after closing
  let dueMonthIdx = refMonth - 1; // 0-indexed
  let dueYear = refYear;

  if (dueDay <= closingDay) {
    dueMonthIdx += 1;
    if (dueMonthIdx > 11) {
      dueMonthIdx = 0;
      dueYear += 1;
    }
  }

  const dueDate = new Date(Date.UTC(dueYear, dueMonthIdx, dueDay, 23, 59, 59, 999));

  return {
    referenceMonth: refMonth,
    referenceYear: refYear,
    closingDate,
    dueDate,
  };
}


/**
 * Obtém ou cria uma fatura para o mês e ano de referência especificados.
 */
export async function getOrCreateInvoice(
  userId: string,
  cardId: string,
  refMonth: number,
  refYear: number,
  closingDate: Date,
  dueDate: Date
) {
  // Tenta encontrar a fatura existente
  let invoice = await prisma.invoice.findUnique({
    where: {
      cardId_referenceMonth_referenceYear: {
        cardId,
        referenceMonth: refMonth,
        referenceYear: refYear,
      },
    },
  });

  if (!invoice) {
    invoice = await prisma.invoice.create({
      data: {
        userId,
        cardId,
        referenceMonth: refMonth,
        referenceYear: refYear,
        closingDate,
        dueDate,
        totalAmount: 0.0,
        status: 'open',
      },
    });
  }

  return invoice;
}

/**
 * Recalcula o valor total de uma fatura com base nas parcelas vinculadas a ela.
 */
export async function recalculateInvoiceAmount(invoiceId: string): Promise<number> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) return 0;

  // Verifica se a fatura ainda possui parcelas. Se não possuir, ela pode ser removida.
  const installmentsCount = await prisma.transactionInstallment.count({
    where: { invoiceId }
  });

  if (installmentsCount === 0) {
    await prisma.invoice.delete({
      where: { id: invoiceId }
    });
    return 0;
  }

  // Soma todas as parcelas vinculadas a esta fatura
  const aggregate = await prisma.transactionInstallment.aggregate({
    where: {
      invoiceId,
    },
    _sum: {
      amount: true,
    },
  });

  const totalAmount = aggregate._sum.amount || 0.0;

  // Atualiza o valor na fatura
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      totalAmount,
    },
  });

  return totalAmount;
}

/**
 * Cria as parcelas para uma determinada transação e as associa às faturas correspondentes.
 */
export async function createInstallmentsForTransaction(transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      card: true,
      splits: true,
    },
  });

  if (!transaction) throw new Error('Transação não encontrada');

  const { 
    installmentsCount, 
    amountTotal, 
    userId, 
    cardId, 
    purchaseDate, 
    card,
    recurrenceType = 'none',
    recurrencePeriod = 'monthly',
    installmentStart = 1
  } = transaction;

  const isFixed = recurrenceType === 'fixed';

  // Calcula valores de cada parcela (lidando com arredondamento de centavos)
  const baseInstallmentAmount = isFixed 
    ? amountTotal 
    : Math.round((amountTotal / installmentsCount) * 100) / 100;
  const lastInstallmentAmount = isFixed 
    ? amountTotal 
    : Math.round((amountTotal - (baseInstallmentAmount * (installmentsCount - 1))) * 100) / 100;

  // Prepara os valores de split por devedor por parcela (com tratamento de arredondamento)
  const splitsInfo = transaction.splits.map(split => {
    const baseSplitAmount = isFixed 
      ? split.amount 
      : Math.round((split.amount / installmentsCount) * 100) / 100;
    const lastSplitAmount = isFixed 
      ? split.amount 
      : Math.round((split.amount - (baseSplitAmount * (installmentsCount - 1))) * 100) / 100;
    return {
      debtorId: split.debtorId,
      baseSplitAmount,
      lastSplitAmount,
    };
  });

  const invoiceIdsToRecalculate = new Set<string>();

  for (let i = 1; i <= installmentsCount; i++) {
    // Calcula a data de compra da parcela com base no período de repetição
    const installmentPurchaseDate = new Date(purchaseDate);
    if (recurrencePeriod === 'daily') {
      installmentPurchaseDate.setUTCDate(purchaseDate.getUTCDate() + (i - 1));
    } else if (recurrencePeriod === 'weekly') {
      installmentPurchaseDate.setUTCDate(purchaseDate.getUTCDate() + (i - 1) * 7);
    } else if (recurrencePeriod === 'biweekly') {
      installmentPurchaseDate.setUTCDate(purchaseDate.getUTCDate() + (i - 1) * 15);
    } else { // monthly
      installmentPurchaseDate.setUTCMonth(purchaseDate.getUTCMonth() + (i - 1));
    }

    // Determina os detalhes da fatura para esta parcela
    const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
      installmentPurchaseDate,
      card.closingDay,
      card.dueDay
    );

    // Obtém ou cria a fatura
    const invoice = await getOrCreateInvoice(
      userId,
      cardId,
      referenceMonth,
      referenceYear,
      closingDate,
      dueDate
    );

    invoiceIdsToRecalculate.add(invoice.id);

    const installmentAmount = (i === installmentsCount) ? lastInstallmentAmount : baseInstallmentAmount;
    const currentInstallmentNumber = installmentStart + (i - 1);

    // Cria a parcela no banco de dados
    const installment = await prisma.transactionInstallment.create({
      data: {
        userId,
        cardId,
        transactionId,
        invoiceId: invoice.id,
        installmentNumber: currentInstallmentNumber,
        amount: installmentAmount,
        dueMonth: referenceMonth,
        dueYear: referenceYear,
        status: invoice.status === 'paid' ? 'paid' : 'pending',
      },
    });

    // Cria os splits da parcela
    for (const splitInfo of splitsInfo) {
      const splitAmountForThisInstallment = (i === installmentsCount) ? splitInfo.lastSplitAmount : splitInfo.baseSplitAmount;
      await prisma.installmentSplit.create({
        data: {
          installmentId: installment.id,
          debtorId: splitInfo.debtorId,
          amount: splitAmountForThisInstallment,
          paid: false,
        },
      });
    }
  }

  // Recalcula o valor total de todas as faturas afetadas
  for (const invoiceId of invoiceIdsToRecalculate) {
    await recalculateInvoiceAmount(invoiceId);
  }
}

/**
 * Garante que todas as transações recorrentes ativas tenham sempre um saldo de faturamento de 12 meses futuros,
 * criando uma nova parcela no final a cada mês que se passa.
 */
export async function ensureRecurringTransactions(userId: string): Promise<void> {
  const now = new Date();
  const currentMonth = now.getUTCMonth(); // 0-indexed (Jan = 0)
  const currentYear = now.getUTCFullYear();

  // 1. Busca os cartões ativos do usuário
  const cards = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
    select: { id: true }
  });
  const cardIds = cards.map(c => c.id);

  if (cardIds.length === 0) return;

  // 2. Busca todas as transações de recorrência fixa associadas aos cartões ativos
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      recurrenceType: 'fixed',
      cardId: { in: cardIds },
    },
    include: {
      installments: true,
      card: true,
      splits: true,
    },
  });

  // 3. Garante um saldo de 12 meses para cada transação recorrente
  for (const tx of transactions) {
    const sortedInstallments = [...tx.installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
    let maxInstallmentNumber = sortedInstallments.length > 0
      ? sortedInstallments[sortedInstallments.length - 1].installmentNumber
      : 0;

    // Verifica cada mês na janela de 12 meses (do mês atual em diante)
    for (let i = 0; i < 12; i++) {
      const checkDate = new Date(Date.UTC(currentYear, currentMonth + i, 1));
      const checkMonth = checkDate.getUTCMonth() + 1; // 1-indexed (Jan = 1)
      const checkYear = checkDate.getUTCFullYear();

      // Verifica se já existe parcela para este mês de vencimento
      const exists = tx.installments.some(
        (inst) => inst.dueMonth === checkMonth && inst.dueYear === checkYear
      );

      if (!exists) {
        // Incrementa a numeração da parcela
        maxInstallmentNumber += 1;

        // Determina os detalhes de fatura para a parcela
        // Usamos uma data simulada de compra baseada no dia de fechamento do cartão neste mês específico
        const purchaseSimulatedDate = new Date(Date.UTC(checkYear, checkMonth - 1, tx.card.closingDay, 12, 0, 0));
        const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
          purchaseSimulatedDate,
          tx.card.closingDay,
          tx.card.dueDay
        );

        // Obtém ou cria a fatura para o mês correspondente
        const invoice = await getOrCreateInvoice(
          userId,
          tx.cardId,
          referenceMonth,
          referenceYear,
          closingDate,
          dueDate
        );

        // Cria a parcela no banco de dados
        const installment = await prisma.transactionInstallment.create({
          data: {
            userId,
            cardId: tx.cardId,
            transactionId: tx.id,
            invoiceId: invoice.id,
            installmentNumber: maxInstallmentNumber,
            amount: tx.amountTotal,
            dueMonth: checkMonth,
            dueYear: checkYear,
            status: invoice.status === 'paid' ? 'paid' : 'pending',
          },
        });

        // Cria os splits para esta nova parcela caso a transação seja compartilhada
        for (const split of tx.splits) {
          await prisma.installmentSplit.create({
            data: {
              installmentId: installment.id,
              debtorId: split.debtorId,
              amount: split.amount,
              paid: false,
            },
          });
        }

        // Recalcula o valor total da fatura
        await recalculateInvoiceAmount(invoice.id);
      }
    }
  }
}
