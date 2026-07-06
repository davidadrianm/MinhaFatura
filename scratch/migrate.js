// Database migration script
// This script shifts existing invoices and installments reference month/year back by 1 month.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migração de faturas e parcelas...');

  // Sort invoices by referenceYear and referenceMonth in ascending order (oldest first)
  // to avoid key unique constraint violations when shifting.
  const invoices = await prisma.invoice.findMany({
    orderBy: [
      { referenceYear: 'asc' },
      { referenceMonth: 'asc' }
    ]
  });

  console.log(`Encontradas ${invoices.length} faturas para processar.`);

  for (const inv of invoices) {
    const closingDate = new Date(inv.closingDate);
    // Since getUTCMonth is 0-indexed (Jan = 0), it is exactly the closing month (1-indexed) - 1.
    // So for closing month 7 (July), newRefMonth is 6 (June).
    let newRefMonth = closingDate.getUTCMonth();
    let newRefYear = closingDate.getUTCFullYear();
    if (newRefMonth === 0) {
      newRefMonth = 12;
      newRefYear -= 1;
    }

    console.log(`Fatura ID ${inv.id} (${inv.cardId}):`);
    console.log(`  - Referência Antiga: ${inv.referenceMonth}/${inv.referenceYear}`);
    console.log(`  - Referência Nova:   ${newRefMonth}/${newRefYear}`);
    console.log(`  - Fechamento:        ${inv.closingDate.toISOString().substring(0, 10)}`);
    console.log(`  - Vencimento:        ${inv.dueDate.toISOString().substring(0, 10)}`);

    if (inv.referenceMonth === newRefMonth && inv.referenceYear === newRefYear) {
      console.log('  -> Já está atualizada.');
      continue;
    }

    // Update invoice reference month/year
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        referenceMonth: newRefMonth,
        referenceYear: newRefYear
      }
    });

    // Update installments belonging to this invoice
    const installmentsUpdateResult = await prisma.transactionInstallment.updateMany({
      where: { invoiceId: inv.id },
      data: {
        dueMonth: newRefMonth,
        dueYear: newRefYear
      }
    });

    console.log(`  -> Atualizada com sucesso! (${installmentsUpdateResult.count} parcelas atualizadas)`);
  }

  console.log('Migração concluída com sucesso!');
}

main()
  .catch(e => {
    console.error('Erro durante a migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
