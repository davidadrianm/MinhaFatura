import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCalendarDate } from '@/lib/date-utils';
import { calculateUsedLimit, getInvoiceStatus } from '@/lib/invoice-utils';
import { addMonthsToRef, todayInAppTz } from '@/lib/date-utils';
import { roundMoney, sumMoney } from '@/lib/money';
import { getUserPreferences } from '@/lib/user-preferences';
import { currencySymbol as currencySymbolOf } from '@/lib/preferences';
import { Suspense } from 'react';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';

export const revalidate = 0; // Evita cache em desenvolvimento

const isLightColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
};

const bankPresets: { [key: string]: string } = {
  'Nubank': '#8D0DE3',
  'Itaú': '#FF6200',
  'Santander': '#EC0000',
  'Bradesco': '#CA0A37',
  'C6 Bank': '#FBFBFB',
  'Inter': '#F27321',
  'Banco do Brasil': '#FCFC30',
};

const getBankIcon = (bankName: string, cardColor?: string) => {
  const colorVal = cardColor || bankPresets[bankName] || '#712ae2';
  const isLight = isLightColor(colorVal);
  
  let text = bankName.substring(0, 2).toUpperCase();
  const name = bankName.toLowerCase();
  if (name.includes('nubank')) text = 'Nu';
  else if (name.includes('itau') || name.includes('itaú')) text = 'It';
  else if (name.includes('inter')) text = 'In';
  else if (name.includes('bradesco')) text = 'Br';
  else if (name.includes('santander')) text = 'St';
  else if (name.includes('c6')) text = 'C6';
  else if (name.includes('banco do brasil')) text = 'BB';

  return {
    text,
    style: {
      backgroundColor: colorVal,
      borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
      color: isLight ? '#1C1B1F' : '#FFFFFF'
    }
  };
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardDataWrapper userId={user.userId} />
    </Suspense>
  );
}

async function DashboardDataWrapper({ userId }: { userId: string }) {
  const user = { userId };
  const currencySymbol = currencySymbolOf((await getUserPreferences(userId)).currency);

  // "Hoje" no fuso do app (o servidor da Vercel roda em UTC).
  const now = new Date();
  const { month: currentMonth, year: currentYear } = todayInAppTz(now);

  // Fatura "do mês": a que fecha neste mês, cuja referência é o mês anterior.
  const { month: targetRefMonth, year: targetRefYear } = addMonthsToRef(currentMonth, currentYear, -1);

  // Últimos 6 meses de referência (o atual e os 5 anteriores), para o gráfico.
  const last6Refs = Array.from({ length: 6 }, (_, idx) => addMonthsToRef(currentMonth, currentYear, idx - 5));

  // Executa todas as consultas em paralelo para reduzir a latência de rede com o banco remoto
  const [
    cards,
    totalLimitUsed,
    pendingDebtorsSum,
    currentMonthInvoices,
    recentTransactions,
    installmentsThisMonth,
    alertInvoices,
    transactionsLast6Months
  ] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: user.userId, isActive: true },
    }),
    calculateUsedLimit(user.userId),
    prisma.installmentSplit.aggregate({
      where: {
        paid: false,
        installment: {
          userId: user.userId
        }
      },
      _sum: {
        amount: true
      }
    }),
    prisma.invoice.findMany({
      where: {
        userId: user.userId,
        referenceMonth: targetRefMonth,
        referenceYear: targetRefYear
      },
      include: {
        card: true,
        installments: {
          include: {
            splits: true
          }
        }
      }
    }),
    prisma.transaction.findMany({
      where: { userId: user.userId },
      include: {
        card: true,
        category: true,
        splits: {
          include: {
            debtor: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      },
      take: 5
    }),
    prisma.transactionInstallment.findMany({
      where: {
        userId: user.userId,
        // Mesmo ciclo usado em "gasto do mês" (antes era o ciclo seguinte, e o donut passava de 100%)
        dueMonth: targetRefMonth,
        dueYear: targetRefYear
      },
      include: {
        transaction: {
          include: {
            category: true
          }
        }
      }
    }),
    prisma.invoice.findMany({
      where: {
        userId: user.userId,
        status: { not: 'paid' },
        paidAt: null,
        OR: [
          // A partir da fatura do mês (antes ficava de fora justamente a que vence agora)
          { referenceYear: { gt: targetRefYear } },
          { referenceYear: targetRefYear, referenceMonth: { gte: targetRefMonth } },
          // ...e qualquer fatura atrasada
          { dueDate: { lt: now } },
        ]
      },
      include: {
        card: true,
        installments: {
          include: {
            splits: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 6
    }),
    prisma.transactionInstallment.findMany({
      where: {
        userId: user.userId,
        OR: last6Refs.map((ref) => ({ dueMonth: ref.month, dueYear: ref.year })),
      },
      select: {
        amount: true,
        dueMonth: true,
        dueYear: true
      }
    })
  ]);

  const activeCurrentMonthInvoices = currentMonthInvoices.map(inv => ({
    ...inv,
    status: getInvoiceStatus(inv)
  }));

  const activeAlertInvoices = alertInvoices.map(inv => ({
    ...inv,
    status: getInvoiceStatus(inv)
  })).filter(inv => inv.status !== 'paid');

  const totalLimits = sumMoney(cards.filter(c => !c.parentCardId).map((card) => card.limit));
  const availableLimit = roundMoney(totalLimits - totalLimitUsed);
  const totalPendingDebtors = roundMoney(pendingDebtorsSum._sum.amount || 0.0);
  const currentMonthSpent = sumMoney(activeCurrentMonthInvoices.map((inv) => inv.totalAmount));

  // Calcula o valor dos devedores nas faturas deste mês
  const currentMonthDebtorsAmount = activeCurrentMonthInvoices.reduce((sum, inv) => {
    const invoiceDebtorsSum = inv.installments.reduce((instSum, inst) => {
      const splitSum = inst.splits ? inst.splits.reduce((sSum, split) => sSum + split.amount, 0) : 0;
      return instSum + splitSum;
    }, 0);
    return sum + invoiceDebtorsSum;
  }, 0);

  const currentMonthTitularSpent = roundMoney(currentMonthSpent - currentMonthDebtorsAmount);

  // Summing the listed upcoming invoices
  const totalUpcomingSpent = sumMoney(activeAlertInvoices.map((inv) => inv.totalAmount));
  const totalUpcomingDebtors = activeAlertInvoices.reduce((sum, inv) => {
    const invoiceDebtorsSum = inv.installments.reduce((instSum, inst) => {
      const splitSum = inst.splits ? inst.splits.reduce((sSum, split) => sSum + split.amount, 0) : 0;
      return instSum + splitSum;
    }, 0);
    return sum + invoiceDebtorsSum;
  }, 0);
  const totalUpcomingTitular = roundMoney(totalUpcomingSpent - totalUpcomingDebtors);

  const categoryMap: { [key: string]: { name: string; color: string; amount: number } } = {};
  installmentsThisMonth.forEach((inst) => {
    const cat = inst.transaction.category;
    if (!categoryMap[cat.id]) {
      categoryMap[cat.id] = {
        name: cat.name,
        color: cat.color,
        amount: 0
      };
    }
    categoryMap[cat.id].amount += inst.amount;
  });

  const categoryList = Object.values(categoryMap)
    .map((cat) => ({ ...cat, amount: roundMoney(cat.amount) }))
    .sort((a, b) => b.amount - a.amount);

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const getInvoiceDisplayDateDetails = (
    card: { closingDay: number; dueDay: number },
    invoice: { closingDate: Date; dueDate: Date; referenceMonth: number } | null | undefined,
    targetMonth: number,
    targetYear: number
  ) => {
    if (invoice) {
      return {
        closingDateStr: new Date(invoice.closingDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dueDateStr: new Date(invoice.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        refMonthStr: monthNames[invoice.referenceMonth - 1]
      };
    }
    // Estimate
    let dueMonthIdx = targetMonth; // Se dueDay > closingDay, o vencimento é no mês seguinte (targetMonth)
    if (card.dueDay <= card.closingDay) {
      dueMonthIdx += 1; // Se dueDay <= closingDay, o vencimento é dois meses após (targetMonth + 1)
    }
    
    let dueYear = targetYear;
    if (dueMonthIdx > 11) {
      dueYear += Math.floor(dueMonthIdx / 12);
      dueMonthIdx = dueMonthIdx % 12;
    }

    // Estimar fechamento
    let closingMonthIdx = dueMonthIdx;
    let closingYear = dueYear;
    if (card.dueDay <= card.closingDay) {
      closingMonthIdx -= 1;
      if (closingMonthIdx < 0) {
        closingMonthIdx = 11;
        closingYear -= 1;
      }
    }
    
    const estimatedDue = new Date(dueYear, dueMonthIdx, card.dueDay);
    const estimatedClosing = new Date(closingYear, closingMonthIdx, card.closingDay);
    return {
      closingDateStr: estimatedClosing.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dueDateStr: estimatedDue.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      refMonthStr: monthNames[targetMonth - 1]
    };
  };

  // Gasto por mês de referência: cada parcela conta no ciclo em que cai
  // (uma compra 10x aparece distribuída, e não inteira no mês da compra).
  const last6MonthsData: { label: string; amount: number }[] = last6Refs.map((ref) => ({
    label: monthNames[ref.month - 1],
    amount: sumMoney(
      transactionsLast6Months
        .filter((inst) => inst.dueMonth === ref.month && inst.dueYear === ref.year)
        .map((inst) => inst.amount)
    ),
  }));

  const maxAmount = Math.max(...last6MonthsData.map(d => d.amount), 1);

  // 9. Cálculo dinâmico para conic-gradient do donut chart
  const topCategories = categoryList.slice(0, 4);
  const slicePercents = topCategories.map((cat) =>
    currentMonthSpent > 0 ? (cat.amount / currentMonthSpent) * 100 : 0
  );
  const gradientAccumulator = slicePercents.reduce((sum, p) => sum + p, 0);
  const donutSlices = topCategories.map((cat, idx) => {
    const percentage = slicePercents[idx];
    const start = slicePercents.slice(0, idx).reduce((sum, p) => sum + p, 0);
    return {
      color: cat.color,
      start: start.toFixed(1),
      end: (start + percentage).toFixed(1),
      percentage: percentage.toFixed(0)
    };
  });

  // Complementar até 100% se necessário
  if (gradientAccumulator < 100 && donutSlices.length > 0) {
    donutSlices.push({
      color: '#ddd6fe',
      start: gradientAccumulator.toFixed(1),
      end: '100.0',
      percentage: (100 - gradientAccumulator).toFixed(0)
    });
  }

  const backgroundGradientStr = donutSlices.length > 0
    ? `conic-gradient(${donutSlices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`
    : 'conic-gradient(#7c3aed 0% 100%)';

  return (
    <div className="space-y-lg stagger">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        
        {/* Card 1: Limite Disponível (destaque) */}
        <div className="hero-card rounded-[22px] p-md flex flex-col justify-between min-h-[148px] hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">Limite Disponível</span>
              <p className="text-[11px] text-white/70 mt-0.5">de {currencySymbol} {totalLimits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no total</p>
            </div>
            <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
              <span className="material-symbols-outlined icon-fill text-[20px]">account_balance_wallet</span>
            </span>
          </div>
          <div>
            <span className="text-display-currency font-extrabold tracking-tight leading-none block">
              <span className="text-headline-sm font-semibold text-white/70 mr-1">{currencySymbol}</span>
              {availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="w-full bg-white/20 h-2 rounded-full mt-sm">
              <div 
                className="progress-glow bg-white h-2 rounded-full transition-all duration-700" 
                style={{ width: `${totalLimits > 0 ? (availableLimit / totalLimits) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Limite Utilizado */}
        <div className="bg-surface-container-lowest rounded-[22px] p-md shadow-card border border-outline-variant/30 flex flex-col justify-between min-h-[148px] hover:-translate-y-1 duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Total Utilizado</span>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Comprometimento de{' '}
                <span className="font-bold text-on-surface">{totalLimits > 0 ? ((totalLimitUsed / totalLimits) * 100).toFixed(1) : 0}%</span>
              </p>
            </div>
            <span className="icon-chip text-rose-500!" style={{ background: 'color-mix(in srgb, #f43f5e 14%, transparent)' }}>
              <span className="material-symbols-outlined icon-fill">trending_up</span>
            </span>
          </div>
          <div>
            <span className="text-display-currency font-extrabold tracking-tight text-on-surface leading-none block">
              <span className="text-headline-sm font-semibold text-on-surface-variant mr-1">{currencySymbol}</span>
              {totalLimitUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="w-full bg-surface-container-high h-2 rounded-full mt-sm">
              <div 
                className="progress-glow h-2 rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-600" 
                style={{ width: `${totalLimits > 0 ? (totalLimitUsed / totalLimits) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Gastos Compartilhados / A Receber */}
        <div className="bg-surface-container-lowest rounded-[22px] p-md shadow-card border border-outline-variant/30 flex flex-col justify-between min-h-[148px] hover:-translate-y-1 duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">A Receber</span>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Gastos compartilhados pendentes</p>
            </div>
            <span className="icon-chip text-emerald-600! dark:text-emerald-300!" style={{ background: 'color-mix(in srgb, #10b981 15%, transparent)' }}>
              <span className="material-symbols-outlined icon-fill">group</span>
            </span>
          </div>
          <div>
            <span className="text-display-currency font-extrabold tracking-tight text-on-surface leading-none block">
              <span className="text-headline-sm font-semibold text-on-surface-variant mr-1">{currencySymbol}</span>
              {totalPendingDebtors.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <Link href="/debtors" className="inline-flex items-center gap-1 mt-sm text-[11px] font-bold text-secondary hover:gap-2 transition-all">
              Ver quem deve
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Listas de Faturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        
        {/* Bloco: Fatura Atual por Cartão */}
        <div className="bg-surface-container-lowest rounded-[22px] p-md shadow-card border border-outline-variant/30 flex flex-col h-[288px]">
          <div className="flex justify-between items-center mb-sm">
            <h3 className="text-body-md font-bold text-on-surface flex items-center gap-sm">
              <span className="icon-chip w-8! h-8!"><span className="material-symbols-outlined icon-fill">credit_card</span></span>
              Fatura Atual
            </h3>
            <Link href="/invoices" className="text-label-sm font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-sm py-1 rounded-full transition-colors">
              Ver faturas
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 divide-y divide-outline-variant/10 scrollbar-thin">
            {cards.map((card) => {
              const invoice = activeCurrentMonthInvoices.find(inv => inv.cardId === card.id);
              const invoiceAmount = invoice ? invoice.totalAmount : 0.0;
              const status = invoice ? invoice.status : 'open';
              const bankInfo = getBankIcon(card.bankName, card.color || undefined);
              
              // Calcular valores de titular e devedor
              const debtorsAmount = invoice ? invoice.installments.reduce((instSum, inst) => {
                const splitSum = inst.splits ? inst.splits.reduce((sSum, split) => sSum + split.amount, 0) : 0;
                return instSum + splitSum;
              }, 0) : 0;
              const titularAmount = invoiceAmount - debtorsAmount;

              const dateDetails = getInvoiceDisplayDateDetails(card, invoice, targetRefMonth, targetRefYear);

              return (
                <div key={card.id} className="py-sm">
                  <div className="flex items-center justify-between">
                    {/* Left: bank icon and info */}
                    <div className="flex items-center gap-sm min-w-0 flex-1">
                      <div 
                        className="w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs select-none shrink-0"
                        style={bankInfo.style}
                      >
                        {bankInfo.text}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-on-surface truncate">{card.name}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          Fecha {dateDetails.closingDateStr} • Vence {dateDetails.dueDateStr} • Ref: {dateDetails.refMonthStr}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Titular vs Devedores split in text */}
                    <div className="flex flex-col gap-[2px] text-[11px] text-on-surface-variant font-semibold flex-1 justify-center pl-4">
                      <span className="flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                        Titular: {currencySymbol} {titularAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container shrink-0" />
                        Devedores: {currencySymbol} {debtorsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Right: Total amount and status badge */}
                    <div className="flex flex-col items-end shrink-0 pl-sm min-w-[100px]">
                      <span className="text-body-sm font-bold text-on-surface">
                        {currencySymbol} {invoiceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                        status === 'overdue' 
                          ? 'bg-error-container text-on-error-container' 
                          : status === 'closed' 
                          ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                          : status === 'paid'
                          ? 'bg-tertiary-fixed text-on-tertiary-container'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {status === 'overdue' ? 'Vencida' : status === 'closed' ? 'Fechada' : status === 'paid' ? 'Pago' : 'Aberta'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {cards.length === 0 && (
              <div className="text-center py-8 text-xs text-on-surface-variant opacity-60">
                Nenhum cartão cadastrado.
              </div>
            )}
          </div>

          {/* Footer TOTAL GERAL */}
          <div className="pt-sm mt-sm border-t border-outline-variant/20 flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">TOTAL GERAL</span>
            
            <div className="flex gap-md text-[11px] font-semibold text-on-surface-variant justify-center flex-1 pl-4">
              <span className="flex items-center gap-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                Titular: {currencySymbol} {currentMonthTitularSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="flex items-center gap-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container shrink-0" />
                Devedores: {currencySymbol} {currentMonthDebtorsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <span className="text-body-md font-bold text-on-surface min-w-[100px] text-right">
              {currencySymbol} {currentMonthSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Bloco: Próximas Faturas (antigo Faturas do Mês) */}
        <div className="bg-surface-container-lowest rounded-[22px] p-md shadow-card border border-outline-variant/30 flex flex-col h-[288px]">
          <div className="flex justify-between items-center mb-sm">
            <h3 className="text-body-md font-bold text-on-surface flex items-center gap-sm">
              <span className="icon-chip w-8! h-8!"><span className="material-symbols-outlined icon-fill">calendar_month</span></span>
              Próximas Faturas
            </h3>
            <Link href="/invoices" className="text-label-sm font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-sm py-1 rounded-full transition-colors">
              Ver faturas
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 divide-y divide-outline-variant/10 scrollbar-thin">
            {activeAlertInvoices.map((inv) => {
              const bankInfo = getBankIcon(inv.card.bankName, inv.card.color || undefined);
              const status = inv.status;
              
              // Calcular valores de titular e devedor
              const debtorsAmount = inv.installments.reduce((instSum, inst) => {
                const splitSum = inst.splits ? inst.splits.reduce((sSum, split) => sSum + split.amount, 0) : 0;
                return instSum + splitSum;
              }, 0);
              const titularAmount = inv.totalAmount - debtorsAmount;

              const dateDetails = getInvoiceDisplayDateDetails(inv.card, inv, inv.referenceMonth, inv.referenceYear);

              return (
                <div key={inv.id} className="py-sm">
                  <div className="flex items-center justify-between">
                    {/* Left: bank icon and info */}
                    <div className="flex items-center gap-sm min-w-0 flex-1">
                      <div 
                        className="w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs select-none shrink-0"
                        style={bankInfo.style}
                      >
                        {bankInfo.text}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-on-surface truncate">{inv.card.name}</p>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          Fecha {dateDetails.closingDateStr} • Vence {dateDetails.dueDateStr} • Ref: {dateDetails.refMonthStr}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Titular vs Devedores split in text */}
                    <div className="flex flex-col gap-[2px] text-[11px] text-on-surface-variant font-semibold flex-1 justify-center pl-4">
                      <span className="flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                        Titular: {currencySymbol} {titularAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="flex items-center gap-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container shrink-0" />
                        Devedores: {currencySymbol} {debtorsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Right: Total amount and status badge */}
                    <div className="flex flex-col items-end shrink-0 pl-sm min-w-[100px]">
                      <span className="text-body-sm font-bold text-on-surface">
                        {currencySymbol} {inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                        status === 'overdue' 
                          ? 'bg-error-container text-on-error-container' 
                          : status === 'closed' 
                          ? 'bg-secondary-fixed text-on-secondary-fixed-variant'
                          : status === 'paid'
                          ? 'bg-tertiary-fixed text-on-tertiary-container'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {status === 'overdue' ? 'Vencida' : status === 'closed' ? 'Fechada' : status === 'paid' ? 'Pago' : 'Aberta'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeAlertInvoices.length === 0 && (
              <div className="text-center py-8 text-xs text-on-surface-variant opacity-60">
                Nenhuma fatura futura pendente.
              </div>
            )}
          </div>

          {/* Footer TOTAL GERAL */}
          <div className="pt-sm mt-sm border-t border-outline-variant/20 flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">TOTAL GERAL</span>
            
            <div className="flex gap-md text-[11px] font-semibold text-on-surface-variant justify-center flex-1 pl-4">
              <span className="flex items-center gap-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                Titular: {currencySymbol} {totalUpcomingTitular.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="flex items-center gap-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container shrink-0" />
                Devedores: {currencySymbol} {totalUpcomingDebtors.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <span className="text-body-md font-bold text-on-surface min-w-[100px] text-right">
              {currencySymbol} {totalUpcomingSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

      </div>

      {/* Alertas de Vencimento */}
      {activeAlertInvoices.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-[22px] p-md shadow-card space-y-sm">
          <h3 className="text-body-lg font-body-lg font-bold text-on-surface flex items-center gap-xs">
            <span className="material-symbols-outlined text-error">warning</span>
            Atenção aos Vencimentos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {activeAlertInvoices.map((inv) => (
              <div key={inv.id} className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-sm space-y-xs hover:border-secondary transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-label-sm font-label-sm text-on-surface-variant font-bold truncate max-w-[120px]">
                    {inv.card.name}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    inv.status === 'overdue' 
                      ? 'bg-error-container text-on-error-container' 
                      : inv.status === 'closed' 
                      ? 'bg-secondary-fixed text-on-secondary-fixed-variant' 
                      : 'bg-surface-container-highest text-on-surface-variant'
                  }`}>
                    {inv.status === 'overdue' ? 'Vencida' : inv.status === 'closed' ? 'Fechada' : 'Aberta'}
                  </span>
                </div>
                <div>
                  <p className="text-headline-md font-headline-md font-bold text-on-surface">
                    {currencySymbol} {inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-label-sm font-label-sm text-on-surface-variant flex items-center gap-xs mt-1">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Vence {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Link 
                  href="/invoices" 
                  className="text-label-sm font-label-sm text-secondary hover:underline block pt-xs font-semibold"
                >
                  Ver faturas
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts & Lists Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-[22px] p-md shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-body-lg font-bold text-on-surface flex items-center gap-sm"><span className="icon-chip w-8! h-8!"><span className="material-symbols-outlined icon-fill">bar_chart</span></span>Evolução Mensal</h3>
            <Link href="/transactions" className="text-label-sm font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-sm py-1 rounded-full transition-colors">
              Ver lançamentos
            </Link>
          </div>
          
          {/* Bar Chart — wrapper with left padding to give Y-axis labels room */}
          <div className="mt-sm pl-12 pr-2 pb-8 relative">
            <div className="h-64 w-full relative border-b border-l border-outline-variant/30 flex items-end justify-between px-sm">
              {/* Y-Axis Labels — positioned relative to the chart border */}
              <div className="absolute left-[-46px] bottom-0 h-full flex flex-col justify-between text-[10px] text-on-surface-variant select-none pb-0">
                <span>{currencySymbol} {maxAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                <span>{currencySymbol} {(maxAmount / 2).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                <span className="text-[10px]">0</span>
              </div>
              
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="w-full h-px bg-outline-variant/20"></div>
                <div className="w-full h-px bg-outline-variant/10"></div>
                <div className="w-full h-px bg-outline-variant/10"></div>
              </div>

              {/* Bars */}
              {last6MonthsData.map((d, index) => {
                const heightPercent = maxAmount > 0 ? (d.amount / maxAmount) * 88 : 0;
                const isCurrentMonth = index === 5;
                return (
                  <div 
                    key={d.label} 
                    className={`flex-1 mx-1.5 rounded-t-xl relative group transition-all duration-500 cursor-default hover:brightness-110 hover:-translate-y-0.5 ${
                      isCurrentMonth ? 'bar-brand-current' : 'bar-brand opacity-80 hover:opacity-100'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 6)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm pointer-events-none">
                      {currencySymbol} {d.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-on-surface-variant ${isCurrentMonth ? 'font-bold text-secondary' : ''}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Donut Chart & Categories */}
        <div className="bg-surface-container-lowest rounded-[22px] p-md shadow-card border border-outline-variant/30 flex flex-col">
          <h3 className="text-body-lg font-bold text-on-surface mb-md flex items-center gap-sm"><span className="icon-chip w-8! h-8!"><span className="material-symbols-outlined icon-fill">donut_large</span></span>Gasto por Categoria</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center py-sm">
            {/* CSS Donut Chart */}
            <div 
              className="relative w-44 h-44 rounded-full flex items-center justify-center transition-all shadow-[0_12px_40px_-12px_rgba(124,58,237,0.45)] hover:scale-[1.03] duration-500" 
              style={{ background: backgroundGradientStr }}
            >
              <div className="w-32 h-32 bg-surface-container-lowest rounded-full flex items-center justify-center flex-col shadow-[0_0_14px_rgba(0,0,0,0.08)_inset]">
                <span className="text-label-sm text-on-surface-variant font-medium">Total do Mês</span>
                <span className="text-body-lg font-extrabold tracking-tight text-on-surface">
                  {currencySymbol} {currentMonthSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-md flex flex-col gap-xs">
            {categoryList.slice(0, 4).map((cat) => {
              const percent = currentMonthSpent > 0 ? ((cat.amount / currentMonthSpent) * 100).toFixed(0) : '0';
              return (
                <div key={cat.name} className="flex items-center justify-between text-label-md">
                  <div className="flex items-center gap-xs">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-on-surface-variant truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  <span className="font-semibold text-on-surface">{percent}%</span>
                </div>
              );
            })}
            {categoryList.length === 0 && (
              <div className="text-center py-4 text-xs text-on-surface-variant opacity-60">
                Nenhum lançamento no mês atual.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Transactions List */}
      <div className="bg-surface-container-lowest rounded-[22px] shadow-card border border-outline-variant/30 overflow-hidden">
        <div className="p-md border-b border-outline-variant/20 flex justify-between items-center">
          <h3 className="text-body-lg font-bold text-on-surface flex items-center gap-sm"><span className="icon-chip w-8! h-8!"><span className="material-symbols-outlined icon-fill">receipt_long</span></span>Últimas Transações</h3>
          <Link href="/transactions" className="text-label-sm font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 px-sm py-1 rounded-full transition-colors">
            Ver todas
          </Link>
        </div>
        
        <ul className="flex flex-col divide-y divide-outline-variant/20">
          {recentTransactions.map((tx) => (
            <li key={tx.id} className="p-md flex items-center justify-between hover:bg-secondary/5 transition-colors">
              <div className="flex items-center gap-md min-w-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tx.category.color}15`, color: tx.category.color }}
                >
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div className="min-w-0">
                  <p className="text-body-md font-medium text-on-surface truncate">{tx.description}</p>
                  <div className="flex items-center gap-xs mt-0.5 text-label-sm text-on-surface-variant">
                    <span className="truncate">{tx.category.name}</span>
                    <span>•</span>
                    <span>{formatCalendarDate(tx.purchaseDate)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-body-md font-semibold text-on-surface">
                  - {currencySymbol} {tx.amountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {tx.splits && tx.splits.length > 0 && (
                  <span className="inline-flex items-center gap-[2px] text-[10px] font-bold bg-primary-container text-on-primary-container px-1.5 py-[2px] rounded-full mt-1">
                    <span className="material-symbols-outlined text-[12px]">group</span>
                    Compartilhado
                  </span>
                )}
              </div>
            </li>
          ))}
          {recentTransactions.length === 0 && (
            <li className="p-8 text-center text-xs text-on-surface-variant opacity-60">
              Nenhuma transação lançada ainda.
            </li>
          )}
        </ul>
      </div>

    </div>
  );
}
