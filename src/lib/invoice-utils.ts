import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { isUniqueViolation } from './prisma-errors';
import { installmentShare, roundMoney, sumMoney } from './money';
import { todayInAppTz, utcDateOnly } from './date-utils';

/** Cliente do Prisma ou cliente de uma transação ($transaction). */
export type Db = Prisma.TransactionClient;

/** Opções padrão para transações interativas (o banco é remoto, então damos folga). */
export const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

interface InvoiceDetails {
  referenceMonth: number;
  referenceYear: number;
  closingDate: Date;
  dueDate: Date;
}

export type RecurrencePeriod = 'daily' | 'weekly' | 'biweekly' | 'monthly';

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

/**
 * Cria uma data UTC no dia `day` do mês, limitando ao último dia do mês
 * (ex.: fechamento dia 31 em fevereiro → 28/02, e não 03/03).
 * `monthIdx` pode passar de 11 ou ser negativo; o ano é ajustado.
 */
export function dateAtDay(
  year: number,
  monthIdx: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  const first = new Date(Date.UTC(year, monthIdx, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  return new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m)), hours, minutes, seconds, ms));
}

/**
 * Desloca uma data em um número de meses, mantendo o dia correspondente de forma segura
 * (evitando overflow no dia do mês).
 */
export function shiftMonth(date: Date, months: number): Date {
  const newDate = new Date(date.getTime());
  const day = newDate.getUTCDate();
  newDate.setUTCDate(1);
  newDate.setUTCMonth(newDate.getUTCMonth() + months);
  const year = newDate.getUTCFullYear();
  const month = newDate.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  newDate.setUTCDate(Math.min(day, lastDay));
  return newDate;
}

/**
 * Soma `steps` períodos de recorrência a uma data, sempre a partir da data base
 * (31/01 + 1 mês = 28/02; + 2 meses = 31/03).
 */
export function addPeriod(base: Date, period: string, steps: number): Date {
  const d = new Date(base.getTime());
  if (period === 'daily') {
    d.setUTCDate(d.getUTCDate() + steps);
    return d;
  }
  if (period === 'weekly') {
    d.setUTCDate(d.getUTCDate() + steps * 7);
    return d;
  }
  if (period === 'biweekly') {
    d.setUTCDate(d.getUTCDate() + steps * 15);
    return d;
  }
  return shiftMonth(base, steps);
}

/**
 * Calcula os detalhes da fatura para uma data de compra específica,
 * baseado no dia de fechamento e dia de vencimento do cartão.
 * Compras feitas no próprio dia do fechamento vão para a fatura seguinte.
 */
export function calculateInvoiceDate(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number
): InvoiceDetails {
  // Métodos UTC para não deslocar a data de calendário pelo fuso.
  const year = purchaseDate.getUTCFullYear();
  const month = purchaseDate.getUTCMonth(); // 0-indexed

  const closingThisMonth = dateAtDay(year, month, closingDay);

  let refMonth = month + 1; // 1-indexed (Jan = 1) — mês em que a fatura fecha
  let refYear = year;

  if (purchaseDate >= closingThisMonth) {
    refMonth += 1;
    if (refMonth > 12) {
      refMonth = 1;
      refYear += 1;
    }
  }

  const closingDate = dateAtDay(refYear, refMonth - 1, closingDay, 23, 59, 59, 999);

  // Se o dia de vencimento é menor ou igual ao de fechamento, vence no mês seguinte ao fechamento.
  const dueMonthIdx = dueDay <= closingDay ? refMonth : refMonth - 1;
  const dueDate = dateAtDay(refYear, dueMonthIdx, dueDay, 23, 59, 59, 999);

  // O mês de referência é o mês anterior ao fechamento (mês em que o ciclo de compras começa).
  let referenceMonth = refMonth - 1;
  let referenceYear = refYear;
  if (referenceMonth === 0) {
    referenceMonth = 12;
    referenceYear -= 1;
  }

  return { referenceMonth, referenceYear, closingDate, dueDate };
}

/**
 * Obtém ou cria uma fatura para o mês e ano de referência (upsert atômico,
 * sem corrida entre duas requisições simultâneas).
 */
export async function getOrCreateInvoice(
  userId: string,
  cardId: string,
  refMonth: number,
  refYear: number,
  closingDate: Date,
  dueDate: Date,
  db: Db = prisma
) {
  return db.invoice.upsert({
    where: {
      cardId_referenceMonth_referenceYear: { cardId, referenceMonth: refMonth, referenceYear: refYear },
    },
    update: {},
    create: {
      userId,
      cardId,
      referenceMonth: refMonth,
      referenceYear: refYear,
      closingDate,
      dueDate,
      totalAmount: 0,
      status: 'open',
    },
  });
}

/**
 * Recalcula o valor total de uma fatura com base nas parcelas vinculadas a ela.
 * Faturas vazias são removidas, exceto as pagas (para não perder o histórico de pagamento).
 */
export async function recalculateInvoiceAmount(invoiceId: string, db: Db = prisma): Promise<number> {
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return 0;

  const installments = await db.transactionInstallment.findMany({
    where: { invoiceId },
    select: { amount: true },
  });

  if (installments.length === 0 && invoice.status !== 'paid' && !invoice.paidAt) {
    await db.invoice.delete({ where: { id: invoiceId } });
    return 0;
  }

  const totalAmount = sumMoney(installments.map((i) => i.amount));
  await db.invoice.update({ where: { id: invoiceId }, data: { totalAmount } });
  return totalAmount;
}

export async function recalculateInvoices(invoiceIds: Iterable<string>, db: Db = prisma) {
  for (const id of new Set(invoiceIds)) {
    await recalculateInvoiceAmount(id, db);
  }
}

/** Status de pagamento de um devedor numa parcela, para ser preservado em edições. */
export type SplitStatusMap = Map<string, { paid: boolean; paidAt: Date | null }>;

export function splitStatusFrom(splits: { debtorId: string; paid: boolean; paidAt: Date | null }[]): SplitStatusMap {
  return new Map(splits.map((s) => [s.debtorId, { paid: s.paid, paidAt: s.paidAt }]));
}

interface CreateInstallmentsOptions {
  /** Cria apenas as parcelas com estes números (as demais já existem em outra transação). */
  onlyNumbers?: Set<number>;
  /** Status dos devedores a restaurar, na ordem das parcelas criadas. */
  preservedSplitStatus?: SplitStatusMap[];
}

/**
 * Cria as parcelas para uma determinada transação e as associa às faturas correspondentes.
 * Devolve as parcelas criadas, em ordem.
 */
export async function createInstallmentsForTransaction(
  transactionId: string,
  db: Db = prisma,
  options: CreateInstallmentsOptions = {}
) {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { card: true, splits: true },
  });
  if (!transaction) throw new Error('Transação não encontrada');

  const { installmentsCount, amountTotal, userId, cardId, purchaseDate, card } = transaction;
  const recurrencePeriod = transaction.recurrencePeriod || 'monthly';
  const installmentStart = transaction.installmentStart || 1;
  const isFixed = transaction.recurrenceType === 'fixed' || transaction.recurrenceType === 'fixed_ended';

  const invoiceIds = new Set<string>();
  const created: { id: string; installmentNumber: number }[] = [];
  const splitRows: Prisma.InstallmentSplitCreateManyInput[] = [];

  const loopStart = isFixed ? 1 : installmentStart;
  for (let i = loopStart; i <= installmentsCount; i++) {
    if (options.onlyNumbers && !options.onlyNumbers.has(i)) continue;

    const steps = isFixed ? i - 1 : i - installmentStart;
    const installmentDate = addPeriod(purchaseDate, recurrencePeriod, steps);
    const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
      installmentDate,
      card.closingDay,
      card.dueDay
    );

    const invoice = await getOrCreateInvoice(userId, cardId, referenceMonth, referenceYear, closingDate, dueDate, db);
    invoiceIds.add(invoice.id);

    const amount = isFixed ? roundMoney(amountTotal) : installmentShare(amountTotal, installmentsCount, i);

    const installment = await db.transactionInstallment.create({
      data: {
        userId,
        cardId,
        transactionId,
        invoiceId: invoice.id,
        installmentNumber: i,
        amount,
        dueMonth: referenceMonth,
        dueYear: referenceYear,
        status: invoice.status === 'paid' ? 'paid' : 'pending',
      },
    });

    const preserved = options.preservedSplitStatus?.[created.length];
    for (const split of transaction.splits) {
      const status = preserved?.get(split.debtorId);
      splitRows.push({
        installmentId: installment.id,
        debtorId: split.debtorId,
        amount: isFixed ? roundMoney(split.amount) : installmentShare(split.amount, installmentsCount, i),
        paid: status?.paid ?? false,
        paidAt: status?.paidAt ?? null,
      });
    }

    created.push({ id: installment.id, installmentNumber: i });
  }

  if (splitRows.length > 0) {
    await db.installmentSplit.createMany({ data: splitRows });
  }

  await recalculateInvoices(invoiceIds, db);
  return created;
}

/**
 * Calcula o limite utilizado real de um cartão ou de todos os cartões de um usuário,
 * desconsiderando parcelas futuras de transações recorrentes fixas.
 */
export async function calculateUsedLimit(userId: string, cardId?: string): Promise<number> {
  const { month: currentMonth, year: currentYear } = todayInAppTz();

  const installments = await prisma.transactionInstallment.findMany({
    where: {
      userId,
      cardId: cardId ? cardId : undefined,
      status: 'pending',
      invoice: { status: { not: 'paid' }, paidAt: null },
    },
    select: {
      amount: true,
      dueMonth: true,
      dueYear: true,
      transaction: { select: { recurrenceType: true } },
    },
  });

  return sumMoney(
    installments
      .filter((inst) => {
        const isFutureFixed =
          (inst.transaction.recurrenceType === 'fixed' || inst.transaction.recurrenceType === 'fixed_ended') &&
          (inst.dueYear > currentYear || (inst.dueYear === currentYear && inst.dueMonth > currentMonth));
        return !isFutureFixed;
      })
      .map((inst) => inst.amount)
  );
}

// Throttle em memória: evita rodar a verificação pesada em toda navegação.
// A proteção contra duplicidade não depende disso: é feita pela constraint
// única (transactionId, installmentNumber) no banco.
const lastCheckedUsers = new Map<string, number>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const RECURRING_WINDOW_MONTHS = 6;

/**
 * Garante que todas as transações recorrentes ativas tenham sempre 6 meses de
 * faturamento futuro, criando uma nova parcela no final a cada mês que se passa.
 */
export async function ensureRecurringTransactions(userId: string, { force = false } = {}): Promise<void> {
  const nowMs = Date.now();
  const lastCheck = lastCheckedUsers.get(userId);
  if (!force && lastCheck && nowMs - lastCheck < CACHE_TTL_MS) return;
  lastCheckedUsers.set(userId, nowMs);

  const { month, year } = todayInAppTz();
  const currentMonthIdx = month - 1;

  const transactions = await prisma.transaction.findMany({
    where: { userId, recurrenceType: 'fixed', card: { isActive: true } },
    include: { installments: true, card: true, splits: true },
  });

  for (const tx of transactions) {
    let maxInstallmentNumber = tx.installments.reduce((max, inst) => Math.max(max, inst.installmentNumber), 0);

    const start = calculateInvoiceDate(tx.purchaseDate, tx.card.closingDay, tx.card.dueDay);

    for (let i = 0; i < RECURRING_WINDOW_MONTHS; i++) {
      // Data simulada de compra no dia do fechamento do cartão neste mês.
      const simulated = dateAtDay(year, currentMonthIdx + i, tx.card.closingDay, 12);
      const { referenceMonth, referenceYear, closingDate, dueDate } = calculateInvoiceDate(
        simulated,
        tx.card.closingDay,
        tx.card.dueDay
      );

      if (
        referenceYear < start.referenceYear ||
        (referenceYear === start.referenceYear && referenceMonth < start.referenceMonth)
      ) {
        continue;
      }

      const exists = tx.installments.some(
        (inst) => inst.dueMonth === referenceMonth && inst.dueYear === referenceYear
      );
      if (exists) continue;

      const nextNumber = maxInstallmentNumber + 1;
      try {
        await prisma.$transaction(async (db) => {
          const invoice = await getOrCreateInvoice(
            userId, tx.cardId, referenceMonth, referenceYear, closingDate, dueDate, db
          );
          const installment = await db.transactionInstallment.create({
            data: {
              userId,
              cardId: tx.cardId,
              transactionId: tx.id,
              invoiceId: invoice.id,
              installmentNumber: nextNumber,
              amount: roundMoney(tx.amountTotal),
              dueMonth: referenceMonth,
              dueYear: referenceYear,
              status: invoice.status === 'paid' ? 'paid' : 'pending',
            },
          });
          if (tx.splits.length > 0) {
            await db.installmentSplit.createMany({
              data: tx.splits.map((split) => ({
                installmentId: installment.id,
                debtorId: split.debtorId,
                amount: roundMoney(split.amount),
                paid: false,
              })),
            });
          }
          await recalculateInvoiceAmount(invoice.id, db);
        }, TX_OPTIONS);
        maxInstallmentNumber = nextNumber;
      } catch (error) {
        // P2002: outra requisição criou a mesma parcela ao mesmo tempo — nada a fazer.
        if (isUniqueViolation(error)) break;
        throw error;
      }
    }
  }
}

/**
 * Calcula dinamicamente o status de uma fatura com base nas datas (no fuso do app)
 * e no status de pagamento.
 */
export function getInvoiceStatus(invoice: {
  status: string;
  closingDate: Date | string;
  dueDate: Date | string;
  paidAt?: Date | string | null;
}): 'paid' | 'overdue' | 'closed' | 'open' {
  if (invoice.status === 'paid' || invoice.paidAt) return 'paid';

  const today = todayInAppTz().iso;
  if (today > utcDateOnly(invoice.dueDate)) return 'overdue';
  // A fatura fecha no próprio dia do fechamento (compras desse dia já vão para a próxima).
  if (today >= utcDateOnly(invoice.closingDate)) return 'closed';
  return 'open';
}
