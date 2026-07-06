import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== CREDIT CARDS ===");
  const cards = await prisma.creditCard.findMany();
  for (const card of cards) {
    console.log(`Card: ${card.name} | Bank: ${card.bankName} | Closing Day: ${card.closingDay} | Due Day: ${card.dueDay} | Parent Card ID: ${card.parentCardId}`);
  }

  console.log("\n=== INVOICES ===");
  const invoices = await prisma.invoice.findMany({
    orderBy: {
      dueDate: 'asc'
    }
  });
  for (const inv of invoices) {
    console.log(`Invoice ID: ${inv.id} | refMonth: ${inv.referenceMonth}/${inv.referenceYear} | closingDate: ${inv.closingDate.toISOString()} | dueDate: ${inv.dueDate.toISOString()} | total: ${inv.totalAmount}`);
  }

  console.log("\n=== TRANSACTIONS ===");
  const txs = await prisma.transaction.findMany({
    where: {
      description: {
        contains: "Lider"
      }
    },
    include: {
      installments: {
        orderBy: {
          installmentNumber: 'asc'
        }
      }
    }
  });

  for (const tx of txs) {
    console.log(`\nTx: ${tx.description} | Date: ${tx.purchaseDate.toISOString()} | Installments: ${tx.installmentsCount}`);
    for (const inst of tx.installments) {
      console.log(`  Inst #${inst.installmentNumber} | dueMonth: ${inst.dueMonth}/${inst.dueYear} | invoiceId: ${inst.invoiceId} | amount: ${inst.amount}`);
      if (inst.invoiceId) {
        const inv = await prisma.invoice.findUnique({ where: { id: inst.invoiceId } });
        if (inv) {
          console.log(`    Invoice -> refMonth: ${inv.referenceMonth}/${inv.referenceYear} | closing: ${inv.closingDate.toISOString()} | due: ${inv.dueDate.toISOString()}`);
        }
      }
    }
  }

  console.log("\n=== GALAXY TRANSACTION ===");
  const galaxyTxs = await prisma.transaction.findMany({
    where: {
      description: {
        contains: "Galaxy"
      }
    },
    include: {
      installments: {
        orderBy: {
          installmentNumber: 'asc'
        }
      }
    }
  });

  for (const tx of galaxyTxs) {
    console.log(`\nTx: ${tx.description} | Date: ${tx.purchaseDate.toISOString()} | Installments: ${tx.installmentsCount}`);
    for (const inst of tx.installments) {
      console.log(`  Inst #${inst.installmentNumber} | dueMonth: ${inst.dueMonth}/${inst.dueYear} | amount: ${inst.amount}`);
      if (inst.invoiceId) {
        const inv = await prisma.invoice.findUnique({ where: { id: inst.invoiceId } });
        if (inv) {
          console.log(`    Invoice -> refMonth: ${inv.referenceMonth}/${inv.referenceYear} | closing: ${inv.closingDate.toISOString()} | due: ${inv.dueDate.toISOString()}`);
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

