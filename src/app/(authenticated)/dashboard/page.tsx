import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCalendarDate } from '@/lib/date-utils';

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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  // Executa todas as consultas em paralelo para reduzir a latência de rede com o banco remoto
  const [
    cards,
    unpaidInvoices,
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
    prisma.invoice.findMany({
      where: {
        userId: user.userId,
        status: { in: ['open', 'closed', 'overdue'] }
      }
    }),
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
        referenceMonth: currentMonth,
        referenceYear: currentYear
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
        dueMonth: currentMonth,
        dueYear: currentYear
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
        status: { in: ['open', 'closed', 'overdue'] },
      },
      include: {
        card: true
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 3
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.userId,
        purchaseDate: {
          gte: sixMonthsAgo
        }
      },
      select: {
        amountTotal: true,
        purchaseDate: true
      }
    })
  ]);

  const totalLimits = cards.filter(c => !c.parentCardId).reduce((sum, card) => sum + card.limit, 0);
  const totalLimitUsed = unpaidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const availableLimit = totalLimits - totalLimitUsed;
  const totalPendingDebtors = pendingDebtorsSum._sum.amount || 0.0;
  const currentMonthSpent = currentMonthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Calcula o valor dos devedores nas faturas deste mês
  const currentMonthDebtorsAmount = currentMonthInvoices.reduce((sum, inv) => {
    const invoiceDebtorsSum = inv.installments.reduce((instSum, inst) => {
      const splitSum = inst.splits ? inst.splits.reduce((sSum, split) => sSum + split.amount, 0) : 0;
      return instSum + splitSum;
    }, 0);
    return sum + invoiceDebtorsSum;
  }, 0);

  const currentMonthTitularSpent = currentMonthSpent - currentMonthDebtorsAmount;

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

  const categoryList = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const last6MonthsData: { label: string; amount: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    last6MonthsData.push({
      label: monthNames[d.getMonth()],
      amount: 0
    });
  }

  transactionsLast6Months.forEach(tx => {
    const txDate = new Date(tx.purchaseDate);
    const txLabel = monthNames[txDate.getMonth()];
    const index = last6MonthsData.findIndex(item => item.label === txLabel);
    if (index !== -1) {
      last6MonthsData[index].amount += tx.amountTotal;
    }
  });

  const maxAmount = Math.max(...last6MonthsData.map(d => d.amount), 1);

  // 9. Cálculo dinâmico para conic-gradient do donut chart
  let gradientAccumulator = 0;
  const donutSlices = categoryList.slice(0, 4).map((cat) => {
    const percentage = currentMonthSpent > 0 ? (cat.amount / currentMonthSpent) * 100 : 0;
    const start = gradientAccumulator;
    gradientAccumulator += percentage;
    return {
      color: cat.color,
      start: start.toFixed(1),
      end: gradientAccumulator.toFixed(1),
      percentage: percentage.toFixed(0)
    };
  });

  // Complementar até 100% se necessário
  if (gradientAccumulator < 100 && donutSlices.length > 0) {
    donutSlices.push({
      color: '#eaddff',
      start: gradientAccumulator.toFixed(1),
      end: '100.0',
      percentage: (100 - gradientAccumulator).toFixed(0)
    });
  }

  const backgroundGradientStr = donutSlices.length > 0
    ? `conic-gradient(${donutSlices.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ')})`
    : 'conic-gradient(#712ae2 0% 100%)';

  return (
    <div className="space-y-lg">
      {/* Financial Summary Bento Grid & Card Invoices Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Column: 2x2 Grid of Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-md">
          
          {/* Card 1: Fatura Atual */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col justify-between h-[136px] hover:-translate-y-0.5 transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-label-md font-label-md text-on-surface-variant">Fatura Atual (Total)</span>
              <span className="material-symbols-outlined text-secondary opacity-70">credit_card</span>
            </div>
            <div>
              <span className="text-display-currency font-display-currency text-on-surface leading-none block mb-1">
                R$ {currentMonthSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              
              <div className="flex justify-between text-[11px] font-semibold text-on-surface-variant mt-1.5">
                <span className="flex items-center gap-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                  Titular: R$ {currentMonthTitularSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="flex items-center gap-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-primary-container shrink-0" />
                  Devedores: R$ {currentMonthDebtorsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 flex overflow-hidden">
                <div 
                  className="bg-secondary h-1.5 transition-all" 
                  style={{ width: `${currentMonthSpent > 0 ? (currentMonthTitularSpent / currentMonthSpent) * 100 : 0}%` }}
                />
                <div 
                  className="bg-on-primary-container h-1.5 transition-all" 
                  style={{ width: `${currentMonthSpent > 0 ? (currentMonthDebtorsAmount / currentMonthSpent) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Limite Disponível */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col justify-between h-[136px] hover:-translate-y-0.5 transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-label-md font-label-md text-on-surface-variant">Limite Disponível</span>
              <span className="material-symbols-outlined text-tertiary-container opacity-70">account_balance_wallet</span>
            </div>
            <div>
              <span className="text-display-currency font-display-currency text-on-surface leading-none block mb-1">
                R$ {availableLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[11px] font-semibold text-on-surface-variant mt-1.5 flex items-center justify-between">
                <span>Total de Limites: R$ {totalLimits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2">
                <div 
                  className="bg-tertiary-fixed-dim h-1.5 rounded-full transition-all" 
                  style={{ width: `${totalLimits > 0 ? (availableLimit / totalLimits) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Limite Utilizado */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col justify-between h-[136px] hover:-translate-y-0.5 transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-label-md font-label-md text-on-surface-variant">Total Utilizado</span>
              <span className="material-symbols-outlined text-on-primary-container opacity-70">reorder</span>
            </div>
            <div>
              <span className="text-display-currency font-display-currency text-on-surface leading-none block mb-1">
                R$ {totalLimitUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[11px] font-semibold text-on-surface-variant mt-1.5 flex items-center justify-between">
                <span>Comprometimento: {totalLimits > 0 ? ((totalLimitUsed / totalLimits) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2">
                <div 
                  className="bg-rose-500 h-1.5 rounded-full transition-all" 
                  style={{ width: `${totalLimits > 0 ? (totalLimitUsed / totalLimits) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Gastos Compartilhados / A Receber */}
          <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col justify-between h-[136px] hover:-translate-y-0.5 transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-label-md font-label-md text-on-surface-variant">A Receber (Compartilhado)</span>
              <span className="material-symbols-outlined text-secondary opacity-70">group</span>
            </div>
            <div>
              <span className="text-display-currency font-display-currency text-on-surface leading-none block mb-1">
                R$ {totalPendingDebtors.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <div className="text-[11px] font-semibold text-on-surface-variant mt-1.5 flex items-center justify-between">
                <span>Total pendente geral</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 opacity-0">
                <div className="h-1.5 rounded-full" />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Faturas por Cartão Block */}
        <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col h-[288px]">
          <div className="flex justify-between items-center mb-sm">
            <h3 className="text-body-md font-body-md font-semibold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary opacity-70">credit_card</span>
              Faturas do Mês
            </h3>
            <Link href="/invoices" className="text-label-sm font-label-sm text-secondary hover:underline font-semibold">
              Ver faturas
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-xs scrollbar-thin">
            {cards.map((card) => {
              const invoice = currentMonthInvoices.find(inv => inv.cardId === card.id);
              const invoiceAmount = invoice ? invoice.totalAmount : 0.0;
              const status = invoice ? invoice.status : 'open';
              const bankInfo = getBankIcon(card.bankName, card.color || undefined);
              
              return (
                <div key={card.id} className="flex items-center justify-between p-xs rounded-lg hover:bg-surface-container-low/40 transition-colors">
                  <div className="flex items-center gap-sm min-w-0">
                    <div 
                      className="w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs select-none shrink-0"
                      style={bankInfo.style}
                    >
                      {bankInfo.text}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-on-surface truncate">{card.name}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{card.bankName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-sm">
                    <span className="text-body-sm font-semibold text-on-surface">
                      R$ {invoiceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      {status === 'overdue' ? 'Vencida' : status === 'closed' ? 'Fechada' : status === 'paid' ? 'Paga' : 'Aberta'}
                    </span>
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
        </div>

      </div>

      {/* Alertas de Vencimento */}
      {alertInvoices.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] space-y-sm">
          <h3 className="text-body-lg font-body-lg font-bold text-on-surface flex items-center gap-xs">
            <span className="material-symbols-outlined text-error">warning</span>
            Atenção aos Vencimentos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {alertInvoices.map((inv) => (
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
                    R$ {inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-body-lg font-body-lg font-semibold text-on-surface">Evolução Mensal</h3>
            <Link href="/transactions" className="text-label-md font-label-md text-secondary hover:underline">
              Ver lançamentos
            </Link>
          </div>
          
          {/* Bar Chart — wrapper with left padding to give Y-axis labels room */}
          <div className="mt-sm pl-12 pr-2 pb-8 relative">
            <div className="h-64 w-full relative border-b border-l border-outline-variant/30 flex items-end justify-between px-sm">
              {/* Y-Axis Labels — positioned relative to the chart border */}
              <div className="absolute left-[-46px] bottom-0 h-full flex flex-col justify-between text-[10px] text-on-surface-variant select-none pb-0">
                <span>R$ {maxAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                <span>R$ {(maxAmount / 2).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
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
                    className={`flex-1 mx-1 rounded-t-md relative group transition-all duration-500 cursor-default ${
                      isCurrentMonth ? 'bg-primary-container' : 'bg-secondary/80'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 6)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded-md text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-sm pointer-events-none">
                      R$ {d.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 flex flex-col">
          <h3 className="text-body-lg font-body-lg font-semibold text-on-surface mb-md">Gasto por Categoria</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center py-sm">
            {/* CSS Donut Chart */}
            <div 
              className="relative w-40 h-40 rounded-full flex items-center justify-center shadow-inner transition-all" 
              style={{ background: backgroundGradientStr }}
            >
              <div className="w-28 h-28 bg-surface-container-lowest rounded-full flex items-center justify-center flex-col shadow-[0_0_10px_rgba(0,0,0,0.05)_inset]">
                <span className="text-label-sm text-on-surface-variant font-medium">Total do Mês</span>
                <span className="text-body-lg font-semibold text-on-surface">
                  R$ {currentMonthSpent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
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
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 overflow-hidden">
        <div className="p-md border-b border-outline-variant/20 flex justify-between items-center bg-surface-bright">
          <h3 className="text-body-lg font-body-lg font-semibold text-on-surface">Últimas Transações</h3>
          <Link href="/transactions" className="text-label-md font-label-md text-secondary hover:underline">
            Ver todas
          </Link>
        </div>
        
        <ul className="flex flex-col divide-y divide-outline-variant/20">
          {recentTransactions.map((tx) => (
            <li key={tx.id} className="p-md flex items-center justify-between hover:bg-surface-container-low/40 transition-colors">
              <div className="flex items-center gap-md min-w-0">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tx.category.color}15`, color: tx.category.color }}
                >
                  <span className="material-symbols-outlined">receipt_long</span>
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
                  - R$ {tx.amountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
