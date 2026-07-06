const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function calculateInvoiceDate(purchaseDate, closingDay, dueDay) {
  const year = purchaseDate.getUTCFullYear();
  const month = purchaseDate.getUTCMonth(); // 0-indexed

  // Closing date for the purchase month (UTC) - set to midnight of the closing day
  const closingThisMonth = new Date(Date.UTC(year, month, closingDay, 0, 0, 0, 0));

  let refMonth = month + 1; // 1-indexed (Jan = 1)
  let refYear = year;

  // If the purchase date is on or after this month's closing, roll forward to next month
  if (purchaseDate >= closingThisMonth) {
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

  // Shift reference month back by 1 month so that the "referenceMonth" matches the purchase month (compras)
  // instead of the closing month.
  let referenceMonth = refMonth - 1;
  let referenceYear = refYear;
  if (referenceMonth === 0) {
    referenceMonth = 12;
    referenceYear -= 1;
  }

  return {
    referenceMonth,
    referenceYear,
    closingDate,
    dueDate,
  };
}

async function getOrCreateInvoice(userId, cardId, refMonth, refYear, closingDate, dueDate) {
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

async function main() {
  console.log('Iniciando reconciliação e recálculo de todas as faturas...');

  // 1. Busca todas as transações com seus cartões e parcelas
  const transactions = await prisma.transaction.findMany({
    include: {
      card: true,
      installments: true,
    }
  });

  console.log(`Encontradas ${transactions.length} transações.`);

  const affectedInvoiceIds = new Set();

  for (const tx of transactions) {
    const { card, installments, recurrenceType, recurrencePeriod, installmentStart = 1 } = tx;
    if (!card) continue;

    const isFixed = recurrenceType === 'fixed';

    for (const inst of installments) {
      // Calcula a data da parcela com base na data de compra da transação principal
      const instPurchaseDate = new Date(tx.purchaseDate);
      const diff = isFixed ? (inst.installmentNumber - 1) : (inst.installmentNumber - installmentStart);

      if (recurrencePeriod === 'daily') {
        instPurchaseDate.setUTCDate(tx.purchaseDate.getUTCDate() + diff);
      } else if (recurrencePeriod === 'weekly') {
        instPurchaseDate.setUTCDate(tx.purchaseDate.getUTCDate() + diff * 7);
      } else if (recurrencePeriod === 'biweekly') {
        instPurchaseDate.setUTCDate(tx.purchaseDate.getUTCDate() + diff * 15);
      } else { // monthly
        instPurchaseDate.setUTCMonth(tx.purchaseDate.getUTCMonth() + diff);
      }

      // Calcula os novos detalhes da fatura
      const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
        instPurchaseDate,
        card.closingDay,
        card.dueDay
      );

      // Cria ou busca a fatura correta
      const invoice = await getOrCreateInvoice(
        tx.userId,
        tx.cardId,
        referenceMonth,
        referenceYear,
        closingDate,
        dueDate
      );

      affectedInvoiceIds.add(invoice.id);
      if (inst.invoiceId) {
        affectedInvoiceIds.add(inst.invoiceId);
      }

      // Se a fatura atual for diferente, atualiza o vínculo
      if (inst.invoiceId !== invoice.id || inst.dueMonth !== referenceMonth || inst.dueYear !== referenceYear) {
        console.log(`Atualizando Parcela ID ${inst.id} (${tx.description} #${inst.installmentNumber}):`);
        console.log(`  - Fatura Antiga: ${inst.invoiceId} (Ref: ${inst.dueMonth}/${inst.dueYear})`);
        console.log(`  - Fatura Nova:   ${invoice.id} (Ref: ${referenceMonth}/${referenceYear})`);

        await prisma.transactionInstallment.update({
          where: { id: inst.id },
          data: {
            invoiceId: invoice.id,
            dueMonth: referenceMonth,
            dueYear: referenceYear,
          }
        });
      }
    }
  }

  // 2. Recalcula os valores de todas as faturas afetadas e limpa as vazias
  console.log('\nRecalculando os valores totais das faturas...');
  for (const invoiceId of affectedInvoiceIds) {
    const installmentsCount = await prisma.transactionInstallment.count({
      where: { invoiceId }
    });

    if (installmentsCount === 0) {
      console.log(`Removendo fatura vazia ID ${invoiceId}`);
      try {
        await prisma.invoice.delete({
          where: { id: invoiceId }
        });
      } catch (err) {
        console.warn(`Não foi possível remover fatura vazia ID ${invoiceId}: ${err.message}`);
      }
      continue;
    }

    const aggregate = await prisma.transactionInstallment.aggregate({
      where: { invoiceId },
      _sum: { amount: true }
    });

    const totalAmount = aggregate._sum.amount || 0.0;

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { totalAmount }
    });
  }

  console.log('\nRecálculo concluído com sucesso!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
