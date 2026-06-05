'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import CustomSelect, { SelectOption } from './CustomSelect';

interface CardOption {
  id: string;
  name: string;
  bankName: string;
  color?: string;
}

const bankPresets: { [key: string]: string } = {
  'Nubank': '#8D0DE3',
  'Itaú': '#FF6200',
  'Santander': '#EC0000',
  'Bradesco': '#CA0A37',
  'C6 Bank': '#FBFBFB',
  'Inter': '#F27321',
  'Banco do Brasil': '#FCFC30',
};

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

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

interface DebtorOption {
  id: string;
  name: string;
}

interface InstallmentSplit {
  id: string;
  amount: number;
  paid: boolean;
  debtor: DebtorOption;
}

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueMonth: number;
  dueYear: number;
  status: string;
  splits: InstallmentSplit[];
}

interface TransactionSplit {
  id: string;
  amount: number;
  debtor: DebtorOption;
}

interface Transaction {
  id: string;
  description: string;
  purchaseDate: string;
  amountTotal: number;
  installmentsCount: number;
  notes: string | null;
  recurrenceType?: string;
  recurrencePeriod?: string;
  installmentStart?: number;
  card: CardOption;
  category: CategoryOption;
  splits: TransactionSplit[];
  installments: Installment[];
}

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  cards: CardOption[];
  categories: CategoryOption[];
  debtors: DebtorOption[];
}

export default function TransactionsClient({
  initialTransactions,
  cards,
  categories,
  debtors,
}: TransactionsClientProps) {
  const filterCardOptions: SelectOption[] = [
    { value: 'all', label: 'Todos os Cartões', icon: 'credit_card' },
    ...cards.map(c => ({ value: c.id, label: c.name, icon: 'credit_card' }))
  ];

  const cardFormOptions: SelectOption[] = cards.map(c => ({
    value: c.id,
    label: c.name,
    icon: 'credit_card'
  }));

  const filterCategoryOptions: SelectOption[] = [
    { value: 'all', label: 'Todas as Categorias', icon: 'category' },
    ...categories.map(c => ({ value: c.id, label: c.name, color: c.color }))
  ];

  const categoryFormOptions: SelectOption[] = categories.map(c => ({
    value: c.id,
    label: c.name,
    color: c.color
  }));

  const recurrenceTypeOptions: SelectOption[] = [
    { value: 'none', label: 'Não (Despesa Única / À Vista)', icon: 'payments' },
    { value: 'fixed', label: 'Fixa Mensal (se repete todo mês)', icon: 'repeat' },
    { value: 'installments', label: 'Parcelada (com prazo e frequência)', icon: 'date_range' },
  ];

  const recurrencePeriodOptions: SelectOption[] = [
    { value: 'daily', label: 'Diário', icon: 'schedule' },
    { value: 'weekly', label: 'Semanal', icon: 'calendar_view_week' },
    { value: 'biweekly', label: 'Quinzenal', icon: 'date_range' },
    { value: 'monthly', label: 'Mensal', icon: 'calendar_month' },
  ];

  const debtorOptions: SelectOption[] = debtors.map(d => ({
    value: d.id,
    label: d.name,
    icon: 'person'
  }));

  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isOpen, setIsOpen] = useState(false); // Modal state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  const [description, setDescription] = useState('');
  const [amountTotal, setAmountTotal] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [notes, setNotes] = useState('');
  
  // Divisão
  const [isSplit, setIsSplit] = useState(false);
  const [formSplits, setFormSplits] = useState<{ debtorId: string; name: string; amount: string }[]>([]);
  const [selectedDebtorId, setSelectedDebtorId] = useState(debtors[0]?.id || '');
  const [splitDebtorAmount, setSplitDebtorAmount] = useState('');

  // Formatted Amount Mask state
  const [amountFormatted, setAmountFormatted] = useState('');
  
  // Recurrence states
  const [recurrenceType, setRecurrenceType] = useState('none');
  const [recurrencePeriod, setRecurrencePeriod] = useState('monthly');
  const [installmentStart, setInstallmentStart] = useState('1');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ref for the scrollable modal body — resets scroll to top on each open
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Handle automatic decimal formatting (comma as decimal separator)
  const handleAmountChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setAmountTotal('');
      setAmountFormatted('');
      return;
    }
    const numValue = parseInt(digits, 10) / 100;
    setAmountTotal(numValue.toFixed(2));
    setAmountFormatted(
      numValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterCard, setFilterCard] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('this-month');
  
  // Estado para controlar quais parcelas estão expandidas
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());

  const router = useRouter();

  // Escuta o query param para abrir o modal automaticamente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === 'true') {
        setIsOpen(true);
        // Limpar o query param sem recarregar a página
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Reset form states when modal opens
  useEffect(() => {
    if (isOpen) {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
      setDescription('');
      setAmountTotal('');
      setAmountFormatted('');
      setInstallmentsCount('1');
      setNotes('');
      setIsSplit(false);
      setFormSplits([]);
      setSplitDebtorAmount('');
      setRecurrenceType('none');
      setRecurrencePeriod('monthly');
      setInstallmentStart('1');
      setError('');
    }
  }, [isOpen]);

  const handleAddSplit = () => {
    if (!selectedDebtorId) return;
    const amountVal = parseFloat(splitDebtorAmount);
    const totalVal = parseFloat(amountTotal);
    
    if (isNaN(amountVal) || amountVal <= 0) {
      alert('Digite um valor válido para a divisão.');
      return;
    }
    
    if (isNaN(totalVal) || totalVal <= 0) {
      alert('Preencha o valor total da compra primeiro.');
      return;
    }

    const debtor = debtors.find(d => d.id === selectedDebtorId);
    if (!debtor) return;

    if (formSplits.some(s => s.debtorId === selectedDebtorId)) {
      alert('Este devedor já foi adicionado.');
      return;
    }

    const currentSum = formSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    if (currentSum + amountVal > totalVal) {
      alert('A soma das divisões não pode exceder o valor total da compra.');
      return;
    }

    setFormSplits([...formSplits, { debtorId: selectedDebtorId, name: debtor.name, amount: splitDebtorAmount }]);
    setSplitDebtorAmount('');
  };

  const handleRemoveSplit = (debtorId: string) => {
    setFormSplits(formSplits.filter(s => s.debtorId !== debtorId));
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!cardId) {
      setError('Por favor, cadastre um cartão primeiro.');
      setLoading(false);
      return;
    }
    if (!categoryId) {
      setError('Por favor, cadastre uma categoria primeiro.');
      setLoading(false);
      return;
    }

    const totalVal = parseFloat(amountTotal);
    if (isNaN(totalVal) || totalVal <= 0) {
      setError('Por favor, insira um valor total maior que zero.');
      setLoading(false);
      return;
    }

    if (isSplit) {
      if (formSplits.length === 0) {
        setError('Adicione pelo menos uma divisão.');
        setLoading(false);
        return;
      }
      const splitsSum = formSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (splitsSum > totalVal) {
        setError('A soma das divisões não pode exceder o valor total da compra.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          purchaseDate,
          amountTotal,
          installmentsCount: recurrenceType === 'none' ? '1' : (recurrenceType === 'fixed' ? '60' : installmentsCount),
          cardId,
          categoryId,
          notes,
          recurrenceType,
          recurrencePeriod: recurrenceType === 'installments' ? recurrencePeriod : 'monthly',
          installmentStart: recurrenceType === 'installments' ? installmentStart : '1',
          splits: isSplit ? formSplits.map(s => ({ debtorId: s.debtorId, amount: s.amount })) : [],
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao registrar transação.');
      } else {
        // Sucesso
        setDescription('');
        setAmountTotal('');
        setInstallmentsCount('1');
        setNotes('');
        setIsSplit(false);
        setFormSplits([]);
        setSplitDebtorAmount('');
        setIsOpen(false); // Fecha o modal
        
        // Atualiza a lista
        const fetchRes = await fetch(`/api/transactions?cardId=${filterCard}&categoryId=${filterCategory}`);
        const fetchData = await fetchRes.json();
        if (fetchData.success) {
          const mapped = fetchData.transactions.map((tx: any) => ({
            ...tx,
            purchaseDate: tx.purchaseDate.split('T')[0]
          }));
          setTransactions(mapped);
          router.refresh();
        }
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm('Deseja excluir esta compra? Todas as parcelas associadas serão apagadas e os valores das faturas recalculados.')) {
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTransactions(transactions.filter(t => t.id !== txId));
        router.refresh();
      } else {
        alert(data.error || 'Erro ao deletar transação.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  const toggleExpand = (txId: string) => {
    const newExpanded = new Set(expandedTxIds);
    if (newExpanded.has(txId)) {
      newExpanded.delete(txId);
    } else {
      newExpanded.add(txId);
    }
    setExpandedTxIds(newExpanded);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) || 
      (tx.notes && tx.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesCard = filterCard === 'all' || tx.card.id === filterCard;
    const matchesCategory = filterCategory === 'all' || tx.category.id === filterCategory;
    
    // Month Filter Logic
    const [yStr, mStr] = tx.purchaseDate.split('-');
    const txMonth = parseInt(mStr);
    const txYear = parseInt(yStr);
    const matchesMonth = matchMonthFilter(filterMonth, txMonth, txYear);

    return matchesSearch && matchesCard && matchesCategory && matchesMonth;
  });

  const getTransactionTypeBadge = (tx: Transaction) => {
    const type = tx.recurrenceType || 'none';
    
    if (type === 'none') {
      return (
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md text-[10px] font-bold select-none bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
          <span className="material-symbols-outlined text-[14px]">payments</span>
          À vista
        </span>
      );
    }
    
    if (type === 'fixed') {
      return (
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md text-[10px] font-bold select-none bg-secondary/10 text-secondary border border-secondary/20">
          <span className="material-symbols-outlined text-[14px]">repeat</span>
          Recorrente
        </span>
      );
    }
    
    if (type === 'installments') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      let text = '';
      const currentInst = tx.installments?.find(
        (inst) => inst.dueMonth === currentMonth && inst.dueYear === currentYear
      );
      if (currentInst) {
        text = `${currentInst.installmentNumber}/${tx.installmentsCount}`;
      } else if (tx.installments && tx.installments.length > 0) {
        const sorted = [...tx.installments].sort((a, b) => a.installmentNumber - b.installmentNumber);
        text = `${sorted[0].installmentNumber}/${tx.installmentsCount}`;
      } else {
        text = `${tx.installmentStart || 1}/${tx.installmentsCount}`;
      }
      
      return (
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md text-[10px] font-bold select-none bg-primary-container text-on-primary-container border border-outline-variant/30">
          <span className="material-symbols-outlined text-[14px]">date_range</span>
          {text}
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-md">
      
      {/* Top filter bar & Create Button */}
      <section className="flex flex-wrap items-center gap-md mb-md">
        <div className="min-w-[180px]">
          <CustomSelect
            options={filterCardOptions}
            value={filterCard}
            onChange={setFilterCard}
          />
        </div>

        <div className="min-w-[180px]">
          <CustomSelect
            options={filterCategoryOptions}
            value={filterCategory}
            onChange={setFilterCategory}
          />
        </div>

        <div className="min-w-[180px]">
          <CustomSelect
            options={monthFilterOptions}
            value={filterMonth}
            onChange={setFilterMonth}
          />
        </div>

        <div className="flex-grow"></div>

        <div className="relative w-full md:w-auto flex gap-sm">
          <div className="relative w-full md:w-[250px]">
            <input 
              type="text"
              placeholder="Buscar transação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant text-label-md font-label-md text-on-surface rounded-lg py-sm pl-xl pr-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
            />
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="bg-secondary text-on-primary font-label-md text-label-md px-md py-base rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-xs shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-label-sm">add</span>
            <span>Registrar Compra</span>
          </button>
        </div>
      </section>

      {/* Transactions Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
        <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high bg-surface-container-low text-label-sm font-label-sm text-on-surface-variant select-none">
                <th className="py-md px-lg font-medium uppercase tracking-wider whitespace-nowrap">Data</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider whitespace-nowrap">Descrição</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider whitespace-nowrap">Categoria</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider whitespace-nowrap">Cartão</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider text-center whitespace-nowrap">Tipo Transação</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider text-right whitespace-nowrap">Valor</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                <th className="py-md px-lg font-medium uppercase tracking-wider text-right whitespace-nowrap">Compartilhado</th>
                <th className="py-md px-lg text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="text-body-md font-body-md text-on-surface divide-y divide-surface-container-high">
              {filteredTransactions.map((tx) => {
                const isExpanded = expandedTxIds.has(tx.id);
                return (
                  <React.Fragment key={tx.id}>
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-md px-lg whitespace-nowrap text-on-surface-variant font-medium">
                        {new Date(tx.purchaseDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-md px-lg font-bold text-on-surface whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{tx.description}</span>
                        </div>
                      </td>
                      <td className="py-md px-lg whitespace-nowrap">
                        <span 
                          className="inline-flex items-center gap-xs px-2 py-1 rounded-md text-[10px] font-bold select-none border"
                          style={{ 
                            backgroundColor: `${tx.category.color}15`, 
                            color: tx.category.color,
                            borderColor: `${tx.category.color}30` 
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tx.category.color }} />
                          {tx.category.name}
                        </span>
                      </td>
                      <td className="py-md px-lg whitespace-nowrap">
                        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md bg-primary-container text-on-primary-container text-[10px] font-bold border border-outline-variant/30 select-none uppercase">
                          <span 
                            className="material-symbols-outlined text-[14px]"
                            style={{ color: tx.card.color || bankPresets[tx.card.bankName] || '#712ae2' }}
                          >
                            credit_card
                          </span>
                          {tx.card.name}
                        </span>
                      </td>
                      <td className="py-md px-lg text-center whitespace-nowrap">
                        {getTransactionTypeBadge(tx)}
                      </td>
                      <td className="py-md px-lg text-right font-bold text-on-surface whitespace-nowrap">
                        R$ {tx.amountTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-md px-lg text-center whitespace-nowrap">
                        <span className="material-symbols-outlined text-[20px] text-tertiary-container opacity-85">
                          check_circle
                        </span>
                      </td>
                      <td className="py-md px-lg text-right whitespace-nowrap">
                        {tx.splits && tx.splits.length > 0 ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md bg-secondary-fixed/50 text-on-secondary-fixed-variant text-[10px] font-bold border border-secondary-fixed-dim/20 select-none">
                              <span className="material-symbols-outlined text-[14px]">call_split</span>
                              + R$ {tx.splits.reduce((sum, s) => sum + s.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber
                            </span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant opacity-30 select-none">-</span>
                        )}
                      </td>
                      <td className="py-md px-lg text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-xs">
                          <button
                            onClick={() => toggleExpand(tx.id)}
                            className="p-[6px] text-on-surface-variant hover:text-secondary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                            title="Ver parcelas"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-[6px] text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Transação"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Cronograma expandido */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-sm bg-surface-container-low/40">
                          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-xl p-md space-y-sm shadow-inner">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-xs select-none">
                              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                              Cronograma de Faturamento / Parcelas
                            </p>
                            
                            {tx.notes && (
                              <div className="text-label-md text-on-surface-variant bg-surface-container-low p-sm rounded-lg border border-outline-variant/20 mb-2">
                                <span className="font-bold block text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Observações:</span>
                                {tx.notes}
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
                              {tx.installments
                                .sort((a, b) => a.installmentNumber - b.installmentNumber)
                                .map((inst) => (
                                  <div key={inst.id} className="p-sm bg-surface border border-outline-variant/30 rounded-lg flex flex-col justify-between min-h-[90px] space-y-sm">
                                    <div>
                                      <div className="flex justify-between items-center text-[9px] font-semibold">
                                        <span className="text-on-surface-variant font-bold">
                                          {tx.recurrenceType === 'fixed'
                                            ? `Mensal Recorrente (${inst.installmentNumber})`
                                            : `Parcela ${inst.installmentNumber}/${tx.installmentsCount}`
                                          }
                                        </span>
                                        <span className={`px-1.5 py-[2px] rounded font-bold uppercase text-[8px] ${
                                          inst.status === 'paid' ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-surface-container-high text-on-surface-variant'
                                        }`}>
                                          {inst.status === 'paid' ? 'Paga' : 'Pend'}
                                        </span>
                                      </div>
                                      <p className="text-body-md font-bold text-on-surface mt-1">R$ {inst.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                      <p className="text-[9px] text-on-surface-variant font-medium mt-0.5">Ref: {inst.dueMonth.toString().padStart(2, '0')}/{inst.dueYear}</p>
                                    </div>
                                    
                                    {inst.splits && inst.splits.length > 0 && (
                                      <div className="border-t border-outline-variant/30 pt-1.5 mt-1 space-y-1">
                                        {inst.splits.map((s) => (
                                          <div key={s.id} className="flex justify-between items-center text-[9px]">
                                            <span className="text-on-surface-variant truncate max-w-[70px]">{s.debtor.name}:</span>
                                            <span className={`font-bold ${s.paid ? 'text-tertiary-container line-through' : 'text-secondary'}`}>
                                              R$ {s.amount.toLocaleString('pt-BR')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-on-surface-variant opacity-60 font-medium select-none">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Modal Overlay para Nova Transação */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-primary/45 backdrop-blur-sm z-[100] flex items-start justify-center overflow-y-auto p-md md:p-lg animate-fade-in">
          
          {/* Modal Content container — grows naturally with content */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl w-full max-w-[600px] relative my-auto">
            
            {/* Header */}
            <div className="p-lg border-b border-outline-variant/20 rounded-t-xl bg-surface-container-lowest">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-md right-md text-on-surface-variant hover:bg-surface-container-low rounded-full w-8 h-8 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="text-headline-md font-headline-md text-primary font-bold">Nova Transação</h3>
              <p className="text-label-md font-label-md text-on-surface-variant mt-xs">Registre um novo gasto manual ou compartilhado.</p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddTransaction}>
              {/* Fields area */}
              <div ref={modalBodyRef} className="p-lg flex flex-col gap-md">
                
                {error && (
                  <div className="bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg border border-error/10 flex items-center gap-xs mb-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {/* Descrição */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Descrição</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Jantar Restaurante XYZ"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
                    />
                  </div>

                  {/* Valor Total */}
                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Valor Total</label>
                    <div className="relative">
                      <span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant font-medium select-none">R$</span>
                      <input 
                        type="text" 
                        required
                        placeholder="0,00"
                        value={amountFormatted}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm pl-[2.8rem] pr-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Data</label>
                    <input 
                      type="date" 
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
                    />
                  </div>

                  {/* Cartão */}
                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Cartão / Conta</label>
                    <CustomSelect
                      options={cardFormOptions}
                      value={cardId}
                      onChange={setCardId}
                      placeholder={cards.length === 0 ? 'Nenhum cartão' : 'Selecione um cartão'}
                      disabled={cards.length === 0}
                    />
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Categoria</label>
                    <CustomSelect
                      options={categoryFormOptions}
                      value={categoryId}
                      onChange={setCategoryId}
                      placeholder={categories.length === 0 ? 'Nenhuma categoria' : 'Selecione uma categoria'}
                      disabled={categories.length === 0}
                    />
                  </div>

                  {/* Despesa Recorrente? */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Despesa Recorrente</label>
                    <CustomSelect
                      options={recurrenceTypeOptions}
                      value={recurrenceType}
                      onChange={setRecurrenceType}
                    />
                  </div>

                  {/* Parcelamento details (only visible if recurrenceType === 'installments') */}
                  {recurrenceType === 'installments' && (
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-md bg-surface-container-low/50 border border-outline-variant/30 p-md rounded-xl animate-fade-in">
                      {/* Qtd Parcelas */}
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Qtd de Parcelas</label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          required
                          value={installmentsCount}
                          onChange={(e) => setInstallmentsCount(e.target.value)}
                          className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
                        />
                      </div>

                      {/* Período de Repetição */}
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Período de Repetição</label>
                        <CustomSelect
                          options={recurrencePeriodOptions}
                          value={recurrencePeriod}
                          onChange={setRecurrencePeriod}
                        />
                      </div>

                      {/* Parcela Inicial */}
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Parcela Inicial</label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          required
                          value={installmentStart}
                          onChange={(e) => setInstallmentStart(e.target.value)}
                          className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Observações (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Detalhes da compra..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm"
                    />
                  </div>
                </div>

                {/* Gasto Compartilhado Switch */}
                <div className="flex items-center justify-between p-md bg-surface-container-low rounded-lg mt-sm select-none">
                  <div className="flex items-center gap-sm">
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
                      <span className="material-symbols-outlined">group</span>
                    </div>
                    <div>
                      <span className="block text-label-md font-label-md text-on-surface font-semibold">Gasto Compartilhado?</span>
                      <span className="block text-label-sm font-label-sm text-on-surface-variant">Divida esta despesa com outras pessoas.</span>
                    </div>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <label className="relative inline-block w-12 h-6 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isSplit}
                      onChange={(e) => {
                        setIsSplit(e.target.checked);
                        if (e.target.checked && debtors.length > 0 && !selectedDebtorId) {
                          setSelectedDebtorId(debtors[0].id);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-outline-variant after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                {/* Área de Divisão do Gasto Expandida */}
                {isSplit && (
                  <div className="bg-secondary-fixed/20 border border-secondary/20 rounded-xl p-md flex flex-col gap-sm shadow-inner animate-fade-in">
                    <h4 className="text-label-md font-label-md text-on-secondary-fixed-variant font-bold flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[18px]">pie_chart</span>
                      Divisão do Gasto
                    </h4>

                    {formSplits.length > 0 && (
                      <div className="space-y-sm">
                        {formSplits.map((s) => (
                          <div key={s.debtorId} className="flex items-center justify-between p-sm bg-surface-container-lowest rounded-lg border border-outline-variant/35 text-label-md">
                            <div className="flex items-center gap-xs">
                              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                              <span className="text-on-surface font-semibold">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-sm">
                              <span className="text-secondary font-bold">R$ {parseFloat(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <button 
                                type="button"
                                onClick={() => handleRemoveSplit(s.debtorId)}
                                className="p-xs text-on-surface-variant hover:text-error hover:bg-error-container/45 rounded-lg transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <div className="flex justify-between items-center text-[10px] text-on-surface-variant bg-surface-container-low p-sm rounded-lg border border-outline-variant/20">
                          <span>Total Divisão:</span>
                          <span className="font-bold">
                            R$ {formSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {amountTotal && ` (Sua parte: R$ ${(parseFloat(amountTotal) - formSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Add split row */}
                    {debtors.length === 0 ? (
                      <p className="text-xs text-on-surface-variant text-center py-2">
                        Nenhum devedor cadastrado. Cadastre primeiro na aba de Devedores.
                      </p>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-sm items-end pt-xs">
                        <div className="w-full sm:w-1/2 space-y-1">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Devedor</span>
                          <CustomSelect
                            options={debtorOptions}
                            value={selectedDebtorId}
                            onChange={setSelectedDebtorId}
                          />
                        </div>
                        
                        <div className="w-full sm:w-5/12 space-y-1">
                          <span className="text-[9px] font-bold text-on-surface-variant uppercase block">Valor (R$)</span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs select-none">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0,00"
                              value={splitDebtorAmount}
                              onChange={(e) => setSplitDebtorAmount(e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface outline-none"
                            />
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleAddSplit}
                          className="w-full sm:w-auto px-3 py-1.5 bg-secondary text-on-secondary rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-xs h-[30px] shadow-sm hover:opacity-90"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          <span>Adicionar</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-lg border-t border-outline-variant/20 bg-surface-container-low flex justify-end gap-md rounded-b-xl">
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-lg py-sm text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-highest rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-lg py-sm bg-secondary text-on-secondary font-label-md text-label-md rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-xs cursor-pointer"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Salvar Transação</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
