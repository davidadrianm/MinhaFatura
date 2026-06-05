'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomSelect, { SelectOption } from './CustomSelect';

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

  const cardOptions: SelectOption[] = [
    { value: 'all', label: 'Todos os Cartões', icon: 'credit_card' },
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

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  return (
    <div className="space-y-md">
      
      {/* Filters Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-wrap md:flex-nowrap gap-md items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h2 className="text-label-md font-bold text-on-surface-variant flex items-center gap-xs uppercase tracking-wider select-none">
          <span className="material-symbols-outlined text-secondary text-[20px]">calendar_month</span>
          Filtros de Faturamento
        </h2>

        <div className="flex flex-wrap md:flex-nowrap gap-sm w-full md:w-auto">
          <div className="flex-1 min-w-[120px] md:w-48">
            <CustomSelect
              options={cardOptions}
              value={filterCard}
              onChange={setFilterCard}
            />
          </div>

          <div className="flex-1 min-w-[120px] md:w-48">
            <CustomSelect
              options={statusOptions}
              value={filterStatus}
              onChange={setFilterStatus}
            />
          </div>

          <div className="flex-1 min-w-[120px] md:w-48">
            <CustomSelect
              options={monthFilterOptions}
              value={filterMonth}
              onChange={setFilterMonth}
            />
          </div>
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
                                  Compra em: {new Date(inst.transaction.purchaseDate).toLocaleDateString('pt-BR')} • {inst.transaction.category.name}
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
