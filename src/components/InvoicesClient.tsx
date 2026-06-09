'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomSelect, { SelectOption } from './CustomSelect';
import MonthPicker from './MonthPicker';
import { formatCalendarDate } from '@/lib/date-utils';

const statusOptions: SelectOption[] = [
  { value: 'all', label: 'Todos os Status', icon: 'filter_list' },
  { value: 'open', label: 'Abertas', icon: 'lock_open' },
  { value: 'closed', label: 'Fechadas', icon: 'lock' },
  { value: 'paid', label: 'Pagas', icon: 'check_circle' },
  { value: 'overdue', label: 'Atrasadas', icon: 'error' },
];

interface Category {
  name: string;
  color: string;
}

interface Transaction {
  description: string;
  purchaseDate: string;
  category: Category;
}

interface Debtor {
  id: string;
  name: string;
}

interface InstallmentSplit {
  id: string;
  amount: number;
  paid: boolean;
  debtor: Debtor;
}

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueMonth: number;
  dueYear: number;
  status: string;
  transaction: Transaction;
  splits: InstallmentSplit[];
}

interface Card {
  id: string;
  name: string;
  bankName: string;
  color?: string;
}

interface Invoice {
  id: string;
  referenceMonth: number;
  referenceYear: number;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  status: string; // "open", "closed", "paid", "overdue"
  paidAt: string | null;
  card: Card;
  installments: Installment[];
}

const getMonthName = (month: number) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1];
};

interface InvoicesClientProps {
  initialInvoices: Invoice[];
  cards: Card[];
}

const getMonthFilterOptions = (): SelectOption[] => {
  const options: SelectOption[] = [
    { value: 'all', label: 'Todo o Período', icon: 'date_range' },
    { value: 'this-month', label: 'Este Mês', icon: 'calendar_today' },
    { value: 'last-month', label: 'Mês Passado', icon: 'history' },
    { value: 'next-month', label: 'Próximo Mês', icon: 'arrow_forward' },
  ];

  const now = new Date();
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  for (let i = -6; i <= 6; i++) {
    const d = new Date();
    d.setMonth(now.getMonth() + i);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const val = `${m.toString().padStart(2, '0')}-${y}`;
    const label = `${months[m - 1]} de ${y}`;
    
    if (i !== 0 && i !== -1 && i !== 1) {
      options.push({
        value: val,
        label,
        icon: 'calendar_month'
      });
    } else {
      const refIdx = options.findIndex(opt => {
        if (i === 0 && opt.value === 'this-month') return true;
        if (i === -1 && opt.value === 'last-month') return true;
        if (i === 1 && opt.value === 'next-month') return true;
        return false;
      });
      if (refIdx !== -1) {
        options[refIdx].label = `${options[refIdx].label} (${months[m - 1]}/${y})`;
      }
    }
  }

  return options;
};

const matchMonthFilter = (filterVal: string, targetMonth: number, targetYear: number) => {
  if (filterVal === 'all') return true;
  
  const now = new Date();
  
  if (filterVal === 'this-month') {
    return targetMonth === (now.getMonth() + 1) && targetYear === now.getFullYear();
  }
  if (filterVal === 'last-month') {
    const d = new Date();
    d.setMonth(now.getMonth() - 1);
    return targetMonth === (d.getMonth() + 1) && targetYear === d.getFullYear();
  }
  if (filterVal === 'next-month') {
    const d = new Date();
    d.setMonth(now.getMonth() + 1);
    return targetMonth === (d.getMonth() + 1) && targetYear === d.getFullYear();
  }
  
  const [mStr, yStr] = filterVal.split('-');
  const m = parseInt(mStr);
  const y = parseInt(yStr);
  return targetMonth === m && targetYear === y;
};

const monthFilterOptions = getMonthFilterOptions();

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

const getBankBadge = (bankName: string, cardColor?: string) => {
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

  return (
    <div 
      className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm select-none shrink-0" 
      style={{
        backgroundColor: colorVal,
        borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)',
        color: isLight ? '#1C1B1F' : '#FFFFFF'
      }}
      title={bankName}
    >
      {text}
    </div>
  );
};

export default function InvoicesClient({ initialInvoices, cards }: InvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filterCard, setFilterCard] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('this-month');

  // Export filtered invoices to CSV
  const handleExportCSV = () => {
    const headers = ['Mês Referência', 'Cartão', 'Fechamento', 'Vencimento', 'Total (R$)', 'Status'];
    
    const rows = filteredInvoices.map(inv => {
      const refMonthStr = `${getMonthName(inv.referenceMonth)} de ${inv.referenceYear}`;
      const card = inv.card.name;
      const closing = new Date(inv.closingDate).toLocaleDateString('pt-BR');
      const due = new Date(inv.dueDate).toLocaleDateString('pt-BR');
      const total = inv.totalAmount.toFixed(2).replace('.', ',');
      
      let statusText = 'Aberta';
      if (inv.status === 'paid') statusText = 'Paga';
      else if (inv.status === 'closed') statusText = 'Fechada';
      else if (inv.status === 'overdue') statusText = 'Atrasada';
      
      return [
        refMonthStr,
        `"${card.replace(/"/g, '""')}"`,
        closing,
        due,
        total,
        statusText
      ];
    });
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `faturas_${filterMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cardOptions: SelectOption[] = [
    { value: 'all', label: 'Todos os cartões', icon: 'credit_card' },
    ...cards.map(c => ({
      value: c.id,
      label: c.name,
      badge: c.bankName,
      icon: 'credit_card'
    }))
  ];
  
  // Controle de faturas expandidas (inicia aberto para as faturas do mês atual)
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const currentYear = now.getFullYear();
    
    const initialExpanded = new Set<string>();
    initialInvoices.forEach(inv => {
      if (inv.referenceMonth === currentMonth && inv.referenceYear === currentYear) {
        initialExpanded.add(inv.id);
      }
    });
    return initialExpanded;
  });
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const router = useRouter();

  const toggleExpand = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoiceIds);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoiceIds(newExpanded);
  };

  const handlePayInvoice = async (invoiceId: string) => {
    setLoadingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoices(invoices.map(inv => {
          if (inv.id === invoiceId) {
            return {
              ...inv,
              status: 'paid',
              paidAt: new Date().toISOString(),
              installments: inv.installments.map(inst => ({ ...inst, status: 'paid' }))
            };
          }
          return inv;
        }));
        router.refresh();
      } else {
        alert(data.error || 'Erro ao pagar fatura.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleUnpayInvoice = async (invoiceId: string) => {
    if (!confirm('Deseja estornar o pagamento desta fatura? Ela e suas parcelas voltarão a ficar pendentes.')) {
      return;
    }
    setLoadingId(invoiceId);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/unpay`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        alert(data.error || 'Erro ao estornar fatura.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesCard = filterCard === 'all' || inv.card.id === filterCard;
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesMonth = matchMonthFilter(filterMonth, inv.referenceMonth, inv.referenceYear);
    return matchesCard && matchesStatus && matchesMonth;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="bg-tertiary-fixed text-on-tertiary-container text-[10px] font-bold px-2.5 py-1 rounded-full uppercase select-none">
            Paga
          </span>
        );
      case 'closed':
        return (
          <span className="bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold px-2.5 py-1 rounded-full uppercase select-none">
            Fechada
          </span>
        );
      case 'overdue':
        return (
          <span className="bg-error-container text-on-error-container text-[10px] font-bold px-2.5 py-1 rounded-full uppercase select-none">
            Atrasada
          </span>
        );
      default: // "open"
        return (
          <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-bold px-2.5 py-1 rounded-full uppercase select-none">
            Aberta
          </span>
        );
    }
  };

  return (
    <div className="space-y-md">
      
      {/* Top header row */}
      <div className="flex flex-wrap items-center justify-between gap-md mb-md">
        <h2 className="text-body-lg font-bold text-on-surface flex items-center gap-xs">
          <span className="material-symbols-outlined text-secondary text-2xl">calendar_month</span>
          Faturas
        </h2>
      </div>

      {/* Filters Bar Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-wrap lg:flex-nowrap gap-md items-end shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full mb-md select-none">
        {/* Cartão select column */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Cartão</label>
          <CustomSelect
            options={cardOptions}
            value={filterCard}
            onChange={setFilterCard}
            variant="filter"
            hideSelectedIcon={true}
          />
        </div>

        {/* Mês select column */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Mês</label>
          <MonthPicker
            value={filterMonth}
            onChange={setFilterMonth}
            variant="filter"
          />
        </div>

        {/* Status segmented selector */}
        <div className="flex-grow min-w-[280px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Status</label>
          <div className="relative inline-flex p-1 bg-surface-container-low border border-transparent rounded-lg h-[42px] items-center w-full select-none overflow-x-auto">
            {/* Sliding background indicator */}
            <div 
              className="absolute top-1 bottom-1 bg-surface-container-lowest rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-outline-variant/15 transition-all duration-300 ease-out"
              style={{
                width: 'calc((100% - 8px) / 5)',
                left: filterStatus === 'all' 
                  ? '4px' 
                  : filterStatus === 'open' 
                    ? 'calc(4px + (100% - 8px) / 5)' 
                    : filterStatus === 'closed' 
                      ? 'calc(4px + 2 * (100% - 8px) / 5)' 
                      : filterStatus === 'paid' 
                        ? 'calc(4px + 3 * (100% - 8px) / 5)' 
                        : 'calc(4px + 4 * (100% - 8px) / 5)'
              }}
            />
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterStatus(opt.value)}
                className={`relative z-10 flex-1 h-full px-sm rounded-md text-label-sm font-semibold transition-colors duration-200 select-none cursor-pointer text-center flex items-center justify-center whitespace-nowrap ${
                  filterStatus === opt.value
                    ? 'text-secondary font-bold'
                    : 'text-on-surface-variant/70 hover:text-on-surface'
                }`}
              >
                {opt.label.replace('Todos os Status', 'Todos')}
              </button>
            ))}
          </div>
        </div>

        {/* Export CSV button column */}
        <div className="ml-auto shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-[42px] px-md text-secondary hover:bg-secondary/5 font-label-md text-label-md transition-colors rounded-lg flex items-center justify-center gap-xs cursor-pointer select-none"
          >
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-sm">
        {filteredInvoices.map((inv) => {
          const isExpanded = expandedInvoiceIds.has(inv.id);
          const isLoading = loadingId === inv.id;

          return (
            <div 
              key={inv.id} 
              className="border border-outline-variant/30 bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-outline-variant/80 transition-all"
            >
              {/* Invoice Main Summary row */}
              <div className="p-md flex flex-wrap md:flex-nowrap justify-between items-center gap-md">
                <div className="flex items-center gap-md min-w-0">
                  {getBankBadge(inv.card.bankName, inv.card.color || undefined)}
                  <div className="min-w-0">
                    <h3 className="text-body-md font-bold text-on-surface truncate flex items-center gap-xs">
                      {getMonthName(inv.referenceMonth)} de {inv.referenceYear}
                      <span className="text-[10px] bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-bold uppercase tracking-wider">{inv.card.name}</span>
                    </h3>
                    <div className="flex items-center gap-sm text-[10px] text-on-surface-variant mt-1 font-semibold">
                      <span className="flex items-center gap-[2px]">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        Fechamento: {new Date(inv.closingDate).toLocaleDateString('pt-BR')}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-[2px]">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        Vencimento: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-md shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold">Total Fatura</p>
                    <p className="text-headline-md font-black text-on-surface">
                      R$ {inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    {(() => {
                      const totalDebtors = inv.installments.reduce((sum, inst) => {
                        const splitSum = inst.splits ? inst.splits.reduce((sSum, split) => sSum + split.amount, 0) : 0;
                        return sum + splitSum;
                      }, 0);
                      const totalTitular = inv.totalAmount - totalDebtors;
                      if (totalDebtors > 0) {
                        return (
                          <div className="flex justify-end gap-xs text-[9px] text-on-surface-variant font-bold mt-0.5 select-none">
                            <span>Titular: R$ {totalTitular.toLocaleString('pt-BR')}</span>
                            <span>•</span>
                            <span className="text-secondary">Devedores: R$ {totalDebtors.toLocaleString('pt-BR')}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="flex items-center gap-sm">
                    {getStatusBadge(inv.status)}
                    
                    <button
                      onClick={() => toggleExpand(inv.id)}
                      className="p-xs text-on-surface-variant hover:text-secondary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {/* Pay/Unpay Action */}
                    {isLoading ? (
                      <span className="material-symbols-outlined animate-spin text-secondary text-[24px] w-24 flex justify-center">progress_activity</span>
                    ) : inv.status === 'paid' ? (
                      <button
                        onClick={() => handleUnpayInvoice(inv.id)}
                        className="w-24 py-1 px-2 bg-surface-container-high hover:bg-surface-dim text-on-surface-variant hover:text-error rounded-lg text-xs font-bold transition-all border border-outline-variant/30 hover:border-error/20 cursor-pointer"
                      >
                        Estornar
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePayInvoice(inv.id)}
                        disabled={inv.totalAmount <= 0}
                        className="w-24 py-1.5 px-2 bg-secondary text-on-secondary disabled:opacity-50 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expandable details */}
              {isExpanded && (
                <div className="bg-surface-container-low/40 border-t border-outline-variant/20 p-md space-y-sm">
                  <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant uppercase tracking-wider select-none">
                    <span>Compras inclusas nesta Fatura</span>
                    {inv.status === 'paid' && inv.paidAt && (
                      <span>Pago em: {new Date(inv.paidAt).toLocaleDateString('pt-BR')} às {new Date(inv.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>

                  {inv.installments.length === 0 ? (
                    <p className="text-xs text-on-surface-variant opacity-60 text-center py-2">Nenhuma compra parcelada ou à vista nesta fatura.</p>
                  ) : (
                    <div className="divide-y divide-outline-variant/15">
                      {inv.installments.map((inst) => {
                        const instDebtorsTotal = inst.splits ? inst.splits.reduce((sum, sp) => sum + sp.amount, 0) : 0;
                        return (
                          <div key={inst.id} className="py-2.5 flex justify-between items-center text-xs">
                            <div className="flex items-center gap-sm min-w-0">
                              <div 
                                className="w-2 h-2 rounded-full shrink-0 shadow-inner" 
                                style={{ backgroundColor: inst.transaction.category.color }}
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-on-surface truncate">{inst.transaction.description}</p>
                                <p className="text-[9px] text-on-surface-variant mt-0.5">
                                  Compra em: {formatCalendarDate(inst.transaction.purchaseDate)} • {inst.transaction.category.name}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-on-surface">
                                R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-[9px] text-on-surface-variant font-medium">
                                Parcela {inst.installmentNumber}
                                {instDebtorsTotal > 0 && ` (Devedores: R$ ${instDebtorsTotal.toLocaleString('pt-BR')})`}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="text-center py-20 border border-dashed border-outline-variant bg-surface rounded-xl space-y-2 p-lg">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-60">calendar_today</span>
            <p className="text-body-md text-on-surface-variant font-medium">Nenhuma fatura encontrada</p>
            <p className="text-label-sm text-on-surface-variant opacity-70">
              As faturas são geradas automaticamente quando compras são lançadas no sistema.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
