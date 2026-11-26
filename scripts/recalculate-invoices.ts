/**
 * Reconcilia parcelas e faturas existentes com a lógica de datas atual.
 *
 * Corrige dados gravados antes das correções de cálculo:
 *  - parcelas de compras em dias 29–31 que caíram na fatura errada (compras à vista e
 *    parceladas; assinaturas ficam de fora porque a numeração não segue os meses);
 *  - datas de fechamento/vencimento que "estouravam" o mês (ex.: fechamento 31 em fevereiro → 03/03);
 *  - faturas desatualizadas depois de mudar o dia de fechamento/vencimento de um cartão;
 *  - totais de fatura com erro de arredondamento.
 *
 * Faturas pagas não são alteradas (nem recebem nem perdem parcelas) — elas só aparecem no relatório.
 *
 * Uso:
 *   npm run recalc                      → simulação: só mostra o que mudaria
 *   npm run recalc -- --apply           → aplica as mudanças
 *   npm run recalc -- --email voce@x.com → limita a um usuário
 */
import { prisma } from '../src/lib/prisma';
import {
  addPeriod,
  calculateInvoiceDate,
  dateAtDay,
  getOrCreateInvoice,
  recalculateInvoices,
  TX_OPTIONS,
} from '../src/lib/invoice-utils';
import { sumMoney } from '../src/lib/money';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const emailIdx = args.indexOf('--email');
const EMAIL = emailIdx >= 0 ? args[emailIdx + 1]?.toLowerCase() : undefined;

const isPaid = (inv: { status: string; paidAt: Date | null } | null | undefined) =>
  !!inv && (inv.status === 'paid' || !!inv.paidAt);

async function main() {
  console.log(APPLY ? '>>> MODO APLICAR: as mudanças serão gravadas\n' : '>>> SIMULAÇÃO (nada será gravado). Use --apply para aplicar.\n');

  const user = EMAIL ? await prisma.user.findUnique({ where: { email: EMAIL } }) : null;
  if (EMAIL && !user) throw new Error(`Usuário ${EMAIL} não encontrado`);
  const userFilter = user ? { userId: user.id } : {};

  let moved = 0;
  let skippedPaid = 0;
  let datesFixed = 0;
  const touchedInvoices = new Set<string>();

  // 1) Parcelas na fatura errada
  const transactions = await prisma.transaction.findMany({
    where: userFilter,
    include: { card: true, installments: { include: { invoice: true } } },
  });

  for (const tx of transactions) {
    // Assinaturas (recorrência fixa) ficam de fora: a numeração das parcelas não
    // corresponde necessariamente aos meses (a janela de 6 meses pode ter pulado meses).
    if (tx.recurrenceType === 'fixed' || tx.recurrenceType === 'fixed_ended') continue;
    const start = tx.installmentStart || 1;

    for (const inst of tx.installments) {
      const steps = inst.installmentNumber - start;
      const date = addPeriod(tx.purchaseDate, tx.recurrencePeriod || 'monthly', steps);
      const expected = calculateInvoiceDate(date, tx.card.closingDay, tx.card.dueDay);

      if (inst.dueMonth === expected.referenceMonth && inst.dueYear === expected.referenceYear && inst.invoiceId) {
        continue;
      }

      const target = await prisma.invoice.findUnique({
        where: {
          cardId_referenceMonth_referenceYear: {
            cardId: tx.cardId,
            referenceMonth: expected.referenceMonth,
            referenceYear: expected.referenceYear,
          },
        },
      });

      const label = `"${tx.description}" #${inst.installmentNumber}: ${inst.dueMonth}/${inst.dueYear} → ${expected.referenceMonth}/${expected.referenceYear}`;
      if (isPaid(inst.invoice) || isPaid(target)) {
        skippedPaid++;
        console.log(`  [pulado, fatura paga] ${label}`);
        continue;
      }

      moved++;
      console.log(`  [mover] ${label}`);
      if (!APPLY) continue;

      await prisma.$transaction(async (db) => {
        const invoice = await getOrCreateInvoice(
          tx.userId, tx.cardId, expected.referenceMonth, expected.referenceYear,
          expected.closingDate, expected.dueDate, db
        );
        await db.transactionInstallment.update({
          where: { id: inst.id },
          data: { invoiceId: invoice.id, dueMonth: expected.referenceMonth, dueYear: expected.referenceYear },
        });
        touchedInvoices.add(invoice.id);
        if (inst.invoiceId) touchedInvoices.add(inst.invoiceId);
      }, TX_OPTIONS);
    }
  }

  // 2) Datas de fechamento/vencimento das faturas em aberto
  const invoices = await prisma.invoice.findMany({ where: userFilter, include: { card: true } });
  for (const inv of invoices) {
    if (isPaid(inv)) continue;
    // Uma compra no dia do fechamento do mês de referência cai exatamente nesta fatura.
    const simulated = dateAtDay(inv.referenceYear, inv.referenceMonth - 1, inv.card.closingDay, 12);
    const expected = calculateInvoiceDate(simulated, inv.card.closingDay, inv.card.dueDay);
    const sameClosing = expected.closingDate.getTime() === inv.closingDate.getTime();
    const sameDue = expected.dueDate.getTime() === inv.dueDate.getTime();
    if (sameClosing && sameDue) continue;

    datesFixed++;
    console.log(
      `  [datas] ${inv.card.name} ${inv.referenceMonth}/${inv.referenceYear}: ` +
      `fecha ${inv.closingDate.toISOString().slice(0, 10)} → ${expected.closingDate.toISOString().slice(0, 10)}, ` +
      `vence ${inv.dueDate.toISOString().slice(0, 10)} → ${expected.dueDate.toISOString().slice(0, 10)}`
    );
    if (APPLY) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { closingDate: expected.closingDate, dueDate: expected.dueDate },
      });
    }
  }

  // 3) Totais (arredondados em centavos) de todas as faturas
  let totalsFixed = 0;
  const withInstallments = await prisma.invoice.findMany({
    where: userFilter,
    include: { installments: { select: { amount: true } } },
  });
  for (const inv of withInstallments) {
    const expectedTotal = sumMoney(inv.installments.map((i) => i.amount));
    if (expectedTotal !== inv.totalAmount || touchedInvoices.has(inv.id)) {
      if (expectedTotal !== inv.totalAmount) totalsFixed++;
      touchedInvoices.add(inv.id);
    }
  }
  if (APPLY) {
    await prisma.$transaction(async (db) => recalculateInvoices(touchedInvoices, db), TX_OPTIONS);
  }

  console.log(
    `\nResumo: ${moved} parcela(s) a mover, ${skippedPaid} pulada(s) por fatura paga, ` +
    `${datesFixed} fatura(s) com datas a corrigir, ${totalsFixed} total(is) a ajustar.`
  );
  if (!APPLY && (moved || datesFixed || totalsFixed)) {
    console.log('Nada foi gravado. Rode novamente com --apply para aplicar.');
  }
}

main()
  .catch((e) => {
    console.error('Erro:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
