import { describe, expect, it, vi } from 'vitest';

// invoice-utils importa o cliente do Prisma; nos testes usamos um banco falso em memória.
vi.mock('../prisma', () => ({ prisma: {} }));

import {
  addPeriod,
  calculateInvoiceDate,
  createInstallmentsForTransaction,
  getInvoiceStatus,
  type Db,
} from '../invoice-utils';
import { sumMoney } from '../money';

const d = (s: string) => new Date(`${s}T12:00:00.000Z`);
const ymd = (date: Date) => date.toISOString().slice(0, 10);
const ref = (r: { referenceMonth: number; referenceYear: number }) => `${r.referenceMonth}/${r.referenceYear}`;

describe('calculateInvoiceDate', () => {
  it('compra antes do fechamento fica na fatura atual; no dia do fechamento vai para a próxima', () => {
    expect(ref(calculateInvoiceDate(d('2026-03-09'), 10, 17))).toBe('2/2026');
    expect(ref(calculateInvoiceDate(d('2026-03-10'), 10, 17))).toBe('3/2026');
  });

  it('limita o fechamento ao último dia do mês (dia 31 em fevereiro)', () => {
    expect(ymd(calculateInvoiceDate(d('2026-02-10'), 31, 10).closingDate)).toBe('2026-02-28');
  });

  it('limita o vencimento ao último dia do mês (dia 31 em abril)', () => {
    expect(ymd(calculateInvoiceDate(d('2026-03-26'), 25, 31).dueDate)).toBe('2026-04-30');
  });

  it('vencimento menor que o fechamento cai no mês seguinte ao fechamento', () => {
    const r = calculateInvoiceDate(d('2026-03-01'), 25, 5);
    expect(ymd(r.closingDate)).toBe('2026-03-25');
    expect(ymd(r.dueDate)).toBe('2026-04-05');
  });
});

describe('addPeriod', () => {
  it('soma meses sem estourar o dia (31/01 → 28/02 → 31/03)', () => {
    expect(ymd(addPeriod(d('2026-01-31'), 'monthly', 1))).toBe('2026-02-28');
    expect(ymd(addPeriod(d('2026-01-31'), 'monthly', 2))).toBe('2026-03-31');
  });

  it('compra 4x em 31/01 cai uma parcela por fatura', () => {
    const refs = [0, 1, 2, 3].map((i) => ref(calculateInvoiceDate(addPeriod(d('2026-01-31'), 'monthly', i), 1, 10)));
    expect(refs).toEqual(['1/2026', '2/2026', '3/2026', '4/2026']);
  });

  it('semanal e quinzenal', () => {
    expect(ymd(addPeriod(d('2026-01-01'), 'weekly', 2))).toBe('2026-01-15');
    expect(ymd(addPeriod(d('2026-01-01'), 'biweekly', 2))).toBe('2026-01-31');
  });
});

describe('getInvoiceStatus', () => {
  it('fatura paga nunca vira atrasada', () => {
    expect(getInvoiceStatus({ status: 'paid', closingDate: '2020-01-01', dueDate: '2020-01-10' })).toBe('paid');
  });

  it('fatura antiga não paga está atrasada', () => {
    expect(
      getInvoiceStatus({ status: 'open', closingDate: '2020-01-01T23:59:59Z', dueDate: '2020-01-10T23:59:59Z' })
    ).toBe('overdue');
  });
});

/** Banco falso com o mínimo usado por createInstallmentsForTransaction. */
function fakeDb(transaction: Record<string, unknown>) {
  type Row = Record<string, unknown> & { id: string };
  const invoices: Row[] = [];
  const installments: Row[] = [];
  const splits: Record<string, unknown>[] = [];
  let seq = 0;

  const db = {
    transaction: { findUnique: async () => transaction },
    invoice: {
      upsert: async ({ where, create }: { where: { cardId_referenceMonth_referenceYear: { referenceMonth: number; referenceYear: number } }; create: Record<string, unknown> }) => {
        const key = where.cardId_referenceMonth_referenceYear;
        let inv = invoices.find((i) => i.referenceMonth === key.referenceMonth && i.referenceYear === key.referenceYear);
        if (!inv) {
          inv = { id: `inv${++seq}`, ...create };
          invoices.push(inv);
        }
        return inv;
      },
      findUnique: async ({ where }: { where: { id: string } }) => invoices.find((i) => i.id === where.id),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
        Object.assign(invoices.find((i) => i.id === where.id)!, data),
      delete: async () => undefined,
    },
    transactionInstallment: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `i${++seq}`, ...data };
        installments.push(row);
        return row;
      },
      findMany: async ({ where }: { where: { invoiceId: string } }) => installments.filter((i) => i.invoiceId === where.invoiceId),
    },
    installmentSplit: {
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        splits.push(...data);
      },
    },
  };

  return { db: db as unknown as Db, invoices, installments, splits };
}

describe('createInstallmentsForTransaction', () => {
  const compra10x = {
    id: 'tx', userId: 'u', cardId: 'c', purchaseDate: d('2026-04-15'), amountTotal: 1000, installmentsCount: 10,
    installmentStart: 4, recurrenceType: 'installments', recurrencePeriod: 'monthly',
    card: { closingDay: 5, dueDay: 15 }, splits: [{ debtorId: 'amigo', amount: 500 }],
  };

  it('"editar desta em diante" recria todas as parcelas restantes (#4 a #10) sem perder valor', async () => {
    const { db, installments, splits } = fakeDb(compra10x);
    const preserved = Array.from({ length: 7 }, (_, i) => new Map([['amigo', { paid: i === 0, paidAt: null }]]));

    await createInstallmentsForTransaction('tx', db, {
      onlyNumbers: new Set([4, 5, 6, 7, 8, 9, 10]),
      preservedSplitStatus: preserved,
    });

    expect(installments.map((i) => i.installmentNumber)).toEqual([4, 5, 6, 7, 8, 9, 10]);
    expect(sumMoney(installments.map((i) => i.amount as number))).toBe(700);
    expect(splits.map((s) => s.amount)).toEqual([50, 50, 50, 50, 50, 50, 50]);
    // quem já tinha pago continua pago
    expect(splits.map((s) => s.paid)).toEqual([true, false, false, false, false, false, false]);
  });

  it('não recria parcela que já foi separada com "só esta"', async () => {
    const { db, installments } = fakeDb(compra10x);
    await createInstallmentsForTransaction('tx', db, { onlyNumbers: new Set([4, 5, 7, 8, 9, 10]) });
    expect(installments.map((i) => i.installmentNumber)).toEqual([4, 5, 7, 8, 9, 10]);
  });

  it('compra 4x em 31/01 gera uma parcela em cada mês de referência', async () => {
    const { db, installments } = fakeDb({
      ...compra10x, purchaseDate: d('2026-01-31'), installmentsCount: 4, installmentStart: 1,
      amountTotal: 400, splits: [], card: { closingDay: 1, dueDay: 10 },
    });
    await createInstallmentsForTransaction('tx', db);
    expect(installments.map((i) => `${i.dueMonth}/${i.dueYear}`)).toEqual(['1/2026', '2/2026', '3/2026', '4/2026']);
  });
});
