'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDialog } from './DialogProvider';
import CustomSelect, { SelectOption } from './CustomSelect';
import MonthPicker from './MonthPicker';
import DatePicker from './DatePicker';
import { formatCalendarDate } from '@/lib/date-utils';

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

const getFilterMonthYear = (filterVal: string): { month: number; year: number } | null => {
  if (filterVal === 'all') return null;
  
  const now = new Date();
  
  if (filterVal === 'this-month') {
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }
  if (filterVal === 'last-month') {
    const d = new Date();
    d.setMonth(now.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }
  if (filterVal === 'next-month') {
    const d = new Date();
    d.setMonth(now.getMonth() + 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }
  
  const [mStr, yStr] = filterVal.split('-');
  const m = parseInt(mStr);
  const y = parseInt(yStr);
  return { month: m, year: y };
};

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

const getInstallmentPurchaseDate = (tx: Transaction, inst: Installment) => {
  const isFixed = tx.recurrenceType === 'fixed' || tx.recurrenceType === 'fixed_ended';
  if (isFixed) {
    return {
      month: inst.dueMonth,
      year: inst.dueYear
    };
  }

  const i = inst.installmentNumber - (tx.installmentStart || 1) + 1;
  const [year, month, day] = tx.purchaseDate.split('-').map(Number);
  const instDate = new Date(Date.UTC(year, month - 1, day));
  
  if (tx.recurrencePeriod === 'daily') {
    instDate.setUTCDate(instDate.getUTCDate() + (i - 1));
  } else if (tx.recurrencePeriod === 'weekly') {
    instDate.setUTCDate(instDate.getUTCDate() + (i - 1) * 7);
  } else if (tx.recurrencePeriod === 'biweekly') {
    instDate.setUTCDate(instDate.getUTCDate() + (i - 1) * 15);
  } else { // monthly
    instDate.setUTCMonth(instDate.getUTCMonth() + (i - 1));
  }

  return {
    month: instDate.getUTCMonth() + 1,
    year: instDate.getUTCFullYear()
  };
};

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
  const { confirm, alert } = useDialog();
  const filterCardOptions: SelectOption[] = [
    { value: 'all', label: 'Todos os cartões', icon: 'credit_card' },
    ...cards.map(c => ({ value: c.id, label: c.name, icon: 'credit_card' }))
  ];

  const cardFormOptions: SelectOption[] = cards.map(c => ({
    value: c.id,
    label: c.name,
    icon: 'credit_card'
  }));

  const filterCategoryOptions: SelectOption[] = [
    { value: 'all', label: 'Todas', icon: 'category' },
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [isEditScopeModalOpen, setIsEditScopeModalOpen] = useState(false);
  const [pendingEditData, setPendingEditData] = useState<any>(null);

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
  const [splitDebtorAmountFormatted, setSplitDebtorAmountFormatted] = useState('');

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
    const hasMinus = val.includes('-');
    
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setAmountTotal('');
      setAmountFormatted(hasMinus ? '-' : '');
      return;
    }
    const numValue = (parseInt(digits, 10) / 100) * (hasMinus ? -1 : 1);
    setAmountTotal(numValue.toFixed(2));
    setAmountFormatted(
      (hasMinus ? '-' : '') + Math.abs(numValue).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Handle automatic decimal formatting for debtor split amount (comma as decimal separator)
  const handleSplitAmountChange = (val: string) => {
    const hasMinus = val.includes('-');
    
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setSplitDebtorAmount('');
      setSplitDebtorAmountFormatted(hasMinus ? '-' : '');
      return;
    }
    const numValue = (parseInt(digits, 10) / 100) * (hasMinus ? -1 : 1);
    setSplitDebtorAmount(numValue.toFixed(2));
    setSplitDebtorAmountFormatted(
      (hasMinus ? '-' : '') + Math.abs(numValue).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Cartão', 'Tipo', 'Valor (R$)', 'Status', 'Compartilhado'];
    
    const rows = filteredTransactions.map(tx => {
      let dateStr = formatCalendarDate(tx.purchaseDate);
      const desc = tx.description;
      const cat = tx.category.name;
      const card = tx.card.name;
      
      const type = tx.recurrenceType || 'none';
      let typeText = 'À vista';
      if (type === 'fixed' || type === 'fixed_ended') {
        typeText = 'Recorrente';
      } else if (type === 'installments') {
        typeText = 'Parcelada';
      }
      
      const filter = getFilterMonthYear(filterMonth);
      let amountVal = tx.amountTotal;
      let statusText = 'Pendente';
      if (filter) {
        const inst = tx.installments?.find(
          i => {
            const instPurchase = getInstallmentPurchaseDate(tx, i);
            return instPurchase.month === filter.month && instPurchase.year === filter.year;
          }
        );
        if (inst) {
          amountVal = inst.amount;
          statusText = inst.status === 'paid' ? 'Pago' : 'Pendente';
          if (tx.recurrenceType && tx.recurrenceType !== 'none') {
            const iIdx = inst.installmentNumber - (tx.installmentStart || 1) + 1;
            const [year, month, day] = tx.purchaseDate.split('-').map(Number);
            const instDate = new Date(Date.UTC(year, month - 1, day));
            if (tx.recurrencePeriod === 'daily') {
              instDate.setUTCDate(instDate.getUTCDate() + (iIdx - 1));
            } else if (tx.recurrencePeriod === 'weekly') {
              instDate.setUTCDate(instDate.getUTCDate() + (iIdx - 1) * 7);
            } else if (tx.recurrencePeriod === 'biweekly') {
              instDate.setUTCDate(instDate.getUTCDate() + (iIdx - 1) * 15);
            } else { // monthly
              instDate.setUTCMonth(instDate.getUTCMonth() + (iIdx - 1));
            }
            dateStr = formatCalendarDate(instDate.toISOString().split('T')[0]);
          }
        }
      } else {
        const allPaid = tx.installments && tx.installments.length > 0 && tx.installments.every(i => i.status === 'paid');
        statusText = allPaid ? 'Pago' : 'Pendente';
      }
      
      const sharedText = tx.splits && tx.splits.length > 0 ? 'Sim' : 'Não';
      
      return [
        dateStr,
        `"${desc.replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        `"${card.replace(/"/g, '""')}"`,
        typeText,
        amountVal.toFixed(2).replace('.', ','),
        statusText,
        sharedText
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
    link.setAttribute('download', `transacoes_${filterMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterCard, setFilterCard] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('this-month');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  
  // Estado para controlar quais parcelas estão expandidas
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());

  const router = useRouter();
  const searchParams = useSearchParams();

  // Escuta o query param para abrir o modal automaticamente
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsOpen(true);
      // Limpar o query param sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Reset form states when modal opens
  useEffect(() => {
    if (isOpen) {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
      if (!txToEdit) {
        setDescription('');
        setAmountTotal('');
        setAmountFormatted('');
        setInstallmentsCount('1');
        setNotes('');
        setIsSplit(false);
        setFormSplits([]);
        setSplitDebtorAmount('');
        setSplitDebtorAmountFormatted('');
        setRecurrenceType('none');
        setRecurrencePeriod('monthly');
        setInstallmentStart('1');
      }
      setError('');
    }
  }, [isOpen]);

  const handleAddSplit = () => {
    if (!selectedDebtorId) return;
    const amountVal = parseFloat(splitDebtorAmount);
    const totalVal = parseFloat(amountTotal);
    
    if (isNaN(amountVal) || amountVal === 0) {
      setError('Digite um valor válido diferente de zero para a divisão.');
      modalBodyRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    if (isNaN(totalVal) || totalVal === 0) {
      setError('Preencha o valor total da compra primeiro.');
      modalBodyRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (Math.sign(amountVal) !== Math.sign(totalVal)) {
      setError('O valor da divisão deve ter o mesmo sinal (positivo/negativo) que o valor total da compra.');
      modalBodyRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const debtor = debtors.find(d => d.id === selectedDebtorId);
    if (!debtor) return;

    if (formSplits.some(s => s.debtorId === selectedDebtorId)) {
      setError('Este devedor já foi adicionado.');
      modalBodyRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const currentSum = formSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    if (Math.abs(currentSum + amountVal) > Math.abs(totalVal)) {
      setError('A soma das divisões não pode exceder o valor total da compra.');
      modalBodyRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setFormSplits([...formSplits, { debtorId: selectedDebtorId, name: debtor.name, amount: splitDebtorAmount }]);
    setSplitDebtorAmount('');
    setSplitDebtorAmountFormatted('');
    setError('');
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
    if (isNaN(totalVal) || totalVal === 0) {
      setError('Por favor, insira um valor total diferente de zero.');
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
      if (Math.abs(splitsSum) > Math.abs(totalVal)) {
        setError('A soma das divisões não pode exceder o valor total da compra.');
        setLoading(false);
        return;
      }
      if (formSplits.some(s => Math.sign(parseFloat(s.amount)) !== Math.sign(totalVal))) {
        setError('Todas as divisões devem ter o mesmo sinal (positivo/negativo) que o valor total da compra.');
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
          installmentsCount: recurrenceType === 'none' ? '1' : (recurrenceType === 'fixed' ? '6' : installmentsCount),
          cardId,
          categoryId,
          notes,
          recurrenceType,
          recurrencePeriod: recurrenceType === 'installments' ? recurrencePeriod : 'monthly',
          installmentStart: recurrenceType === 'installments' ? installmentStart : '1',
          splits: isSplit ? formSplits.map(s => ({ debtorId: s.debtorId, amount: s.amount })) : [],
          selectedMonth: getFilterMonthYear(filterMonth)?.month,
          selectedYear: getFilterMonthYear(filterMonth)?.year,
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
        
        // Atualiza a lista em segundo plano sem bloquear a interface (finally block)
        fetch(`/api/transactions?cardId=${filterCard}&categoryId=${filterCategory}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const mapped = data.transactions.map((tx: any) => ({
                ...tx,
                purchaseDate: tx.purchaseDate.split('T')[0]
              }));
              setTransactions(mapped);
              router.refresh();
            }
          })
          .catch(err => console.error("Erro ao recarregar transações:", err));
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (tx: Transaction) => {
    setTxToEdit(tx);
    
    // Set form fields
    setDescription(tx.description);
    
    // Determine the amount based on whether a month filter is active
    const filter = getFilterMonthYear(filterMonth);
    let amountVal = tx.amountTotal;
    let initialSplits = tx.splits || [];
    
    if (filter && tx.recurrenceType === 'installments') {
      const inst = tx.installments?.find(
        i => {
          const instPurchase = getInstallmentPurchaseDate(tx, i);
          return instPurchase.month === filter.month && instPurchase.year === filter.year;
        }
      );
      if (inst) {
        amountVal = inst.amount;
        initialSplits = inst.splits ? inst.splits.map(s => ({
          id: s.id,
          amount: s.amount,
          debtor: s.debtor,
        })) : [];
      }
    }
    
    // Set amount values
    setAmountTotal(amountVal.toFixed(2));
    setAmountFormatted(
      amountVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    
    let displayDate = tx.purchaseDate;
    let initialInstallmentStart = tx.installmentStart || 1;
    if (filter && tx.recurrenceType && tx.recurrenceType !== 'none') {
      const inst = tx.installments?.find(
        i => {
          const instPurchase = getInstallmentPurchaseDate(tx, i);
          return instPurchase.month === filter.month && instPurchase.year === filter.year;
        }
      );
      if (inst) {
        const i = inst.installmentNumber - (tx.installmentStart || 1) + 1;
        const [year, month, day] = tx.purchaseDate.split('-').map(Number);
        const instDate = new Date(Date.UTC(year, month - 1, day));
        
        if (tx.recurrencePeriod === 'daily') {
          instDate.setUTCDate(instDate.getUTCDate() + (i - 1));
        } else if (tx.recurrencePeriod === 'weekly') {
          instDate.setUTCDate(instDate.getUTCDate() + (i - 1) * 7);
        } else if (tx.recurrencePeriod === 'biweekly') {
          instDate.setUTCDate(instDate.getUTCDate() + (i - 1) * 15);
        } else { // monthly
          instDate.setUTCMonth(instDate.getUTCMonth() + (i - 1));
        }
        displayDate = instDate.toISOString().split('T')[0];
        initialInstallmentStart = inst.installmentNumber;
      }
    }
    setPurchaseDate(displayDate);
    setCardId(tx.card.id);
    setCategoryId(tx.category.id);
    setNotes(tx.notes || '');
    
    // Splits
    if (initialSplits.length > 0) {
      setIsSplit(true);
      setFormSplits(initialSplits.map(s => ({
        debtorId: s.debtor.id,
        name: s.debtor.name,
        amount: s.amount.toFixed(2),
      })));
    } else {
      setIsSplit(false);
      setFormSplits([]);
    }
    
    // Recurrence fields (disabled but set for display)
    setRecurrenceType(tx.recurrenceType || 'none');
    setRecurrencePeriod(tx.recurrencePeriod || 'monthly');
    
    setInstallmentStart(initialInstallmentStart.toString());
    setInstallmentsCount((tx.installmentsCount || 1).toString());
    
    // Open modal
    setIsOpen(true);
  };



  const handleNewTransactionClick = () => {
    setTxToEdit(null);
    setDescription('');
    setAmountTotal('');
    setAmountFormatted('');
    setInstallmentsCount('1');
    setNotes('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setCardId(cards[0]?.id || '');
    setCategoryId(categories[0]?.id || '');
    setIsSplit(false);
    setFormSplits([]);
    setRecurrenceType('none');
    setRecurrencePeriod('monthly');
    setInstallmentStart('1');
    setError('');
    setIsOpen(true);
  };

  const handleSaveEditedTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const totalVal = parseFloat(amountTotal);
    if (isNaN(totalVal) || totalVal === 0) {
      setError('Por favor, insira um valor total diferente de zero.');
      return;
    }

    if (isSplit) {
      if (formSplits.length === 0) {
        setError('Adicione pelo menos uma divisão.');
        return;
      }
      const splitsSum = formSplits.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      if (Math.abs(splitsSum) > Math.abs(totalVal)) {
        setError('A soma das divisões não pode exceder o valor total da compra.');
        return;
      }
      if (formSplits.some(s => Math.sign(parseFloat(s.amount)) !== Math.sign(totalVal))) {
        setError('Todas as divisões devem ter o mesmo sinal (positivo/negativo) que o valor total da compra.');
        return;
      }
    }

    if (!txToEdit) return;

    // Data to be submitted
    const editData = {
      description,
      purchaseDate,
      amountTotal,
      cardId,
      categoryId,
      notes,
      splits: isSplit ? formSplits.map(s => ({ debtorId: s.debtorId, amount: s.amount })) : [],
      isInstallmentLevelValues: getFilterMonthYear(filterMonth) !== null && txToEdit.recurrenceType === 'installments',
      installmentsCount: txToEdit.recurrenceType === 'installments' ? parseInt(installmentsCount) : undefined,
      installmentStart: txToEdit.recurrenceType === 'installments' ? parseInt(installmentStart) : undefined,
    };

    // If the transaction is recurring AND a month filter is active, we must ask for edit scope.
    // Otherwise, we default to editScope = 'all'.
    const filter = getFilterMonthYear(filterMonth);
    const isRecurring = txToEdit.recurrenceType && txToEdit.recurrenceType !== 'none';
    
    if (isRecurring && filter) {
      setPendingEditData(editData);
      setIsEditScopeModalOpen(true);
    } else {
      // Execute edit with 'all' scope
      await executeEditTransaction(txToEdit.id, {
        ...editData,
        editScope: 'all',
      });
    }
  };

  const executeEditTransaction = async (txId: string, dataToSend: any) => {
    setLoading(true);
    setError('');
    try {
      const filter = getFilterMonthYear(filterMonth);
      const payload = {
        ...dataToSend,
        selectedMonth: filter?.month,
        selectedYear: filter?.year,
      };

      const res = await fetch(`/api/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao salvar alteração.');
      } else {
        // Success
        setIsOpen(false);
        setIsEditScopeModalOpen(false);
        setTxToEdit(null);
        setPendingEditData(null);

        // Atualiza a lista em segundo plano de forma não-bloqueante
        fetch(`/api/transactions?cardId=${filterCard}&categoryId=${filterCategory}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const mapped = data.transactions.map((tx: any) => ({
                ...tx,
                purchaseDate: tx.purchaseDate.split('T')[0]
              }));
              setTransactions(mapped);
              router.refresh();
            }
          })
          .catch(err => console.error("Erro ao recarregar transações pós-edição:", err));
      }
    } catch (err) {
      setError('Erro de conexão ao salvar alteração.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async (tx: Transaction) => {
    if (tx.recurrenceType === 'fixed' || tx.recurrenceType === 'fixed_ended') {
      const filter = getFilterMonthYear(filterMonth);
      if (filter) {
        setTxToDelete(tx);
        setIsDeleteModalOpen(true);
        return;
      }
    }

    const isConfirmed = await confirm('Deseja excluir esta compra? Todas as parcelas associadas serão apagadas e os valores das faturas recalculados.', {
      type: 'error',
      title: 'Excluir Compra',
      confirmLabel: 'Excluir',
    });
    if (isConfirmed) {
      await handleDeleteTransaction(tx.id, 'all');
    }
  };

  const handleDeleteTransaction = async (txId: string, type: 'all' | 'future' = 'all', month?: number, year?: number) => {
    try {
      let url = `/api/transactions/${txId}?type=${type}`;
      if (type === 'future' && month && year) {
        url += `&month=${month}&year=${year}`;
      }

      const res = await fetch(url, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (type === 'all') {
          setTransactions(transactions.filter(t => t.id !== txId));
          router.refresh();
        } else {
          // Se deletou parcelas futuras, busca a lista atualizada em segundo plano
          fetch(`/api/transactions?cardId=${filterCard}&categoryId=${filterCategory}`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                const mapped = data.transactions.map((tx: any) => ({
                  ...tx,
                  purchaseDate: tx.purchaseDate.split('T')[0]
                }));
                setTransactions(mapped);
                router.refresh();
              }
            })
            .catch(err => console.error("Erro ao recarregar transações pós-deleção:", err));
        }
      } else {
        await alert(data.error || 'Erro ao deletar transação.', { type: 'error' });
      }
    } catch (err) {
      await alert('Erro de conexão.', { type: 'error' });
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
    
    // Month Filter Logic based on calendar/purchase date (ignoring invoice boundaries)
    const filter = getFilterMonthYear(filterMonth);
    const matchesMonth = !filter || (tx.installments && tx.installments.some(
      (inst) => {
        const instPurchase = getInstallmentPurchaseDate(tx, inst);
        return instPurchase.month === filter.month && instPurchase.year === filter.year;
      }
    ));

    const matchesStatus = (() => {
      if (filterStatus === 'all') return true;
      if (filter) {
        // Find installment for the filtered month based on actual purchase date
        const inst = tx.installments?.find(
          (i) => {
            const instPurchase = getInstallmentPurchaseDate(tx, i);
            return instPurchase.month === filter.month && instPurchase.year === filter.year;
          }
        );
        if (!inst) return false;
        return filterStatus === 'paid' ? inst.status === 'paid' : inst.status !== 'paid';
      } else {
        // If "Todo o Período", check if any installment matches the status
        if (!tx.installments || tx.installments.length === 0) return filterStatus === 'pending';
        return tx.installments.some(inst => 
          filterStatus === 'paid' ? inst.status === 'paid' : inst.status !== 'paid'
        );
      }
    })();

    return matchesSearch && matchesCard && matchesCategory && matchesMonth && matchesStatus;
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
    
    if (type === 'fixed' || type === 'fixed_ended') {
      return (
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md text-[10px] font-bold select-none bg-secondary/10 text-secondary border border-secondary/20">
          <span className="material-symbols-outlined text-[14px]">repeat</span>
          Recorrente
        </span>
      );
    }
    
    if (type === 'installments') {
      const filter = getFilterMonthYear(filterMonth);
      const now = new Date();
      const targetMonth = filter ? filter.month : (now.getMonth() + 1);
      const targetYear = filter ? filter.year : now.getFullYear();
      
      let text = '';
      const currentInst = tx.installments?.find(
        (inst) => {
          const instPurchase = getInstallmentPurchaseDate(tx, inst);
          return instPurchase.month === targetMonth && instPurchase.year === targetYear;
        }
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
        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md text-[10px] font-bold select-none bg-primary-fixed text-on-primary-fixed-variant border border-primary-fixed-dim/30">
          <span className="material-symbols-outlined text-[14px]">date_range</span>
          {text}
        </span>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-md">
      
      {/* Top header row */}
      <div className="flex items-center justify-between gap-md mb-md">
        <h2 className="text-body-lg font-bold text-on-surface flex items-center gap-xs">
          <span className="material-symbols-outlined text-secondary text-2xl">payments</span>
          Transações
        </h2>
      </div>

      {/* Filters Bar Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-wrap lg:flex-nowrap gap-md items-end shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full mb-md select-none">
        {/* Pesquisar column */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Pesquisar</label>
          <div className="relative w-full h-[42px]">
            <input
              type="text"
              placeholder="Buscar transação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-transparent rounded-lg pl-xl pr-md h-full text-label-md font-label-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all duration-200 focus:bg-surface-container-high"
            />
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          </div>
        </div>

        {/* Cartão select column */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Cartão</label>
          <CustomSelect
            options={filterCardOptions}
            value={filterCard}
            onChange={setFilterCard}
            variant="filter"
            hideSelectedIcon={true}
          />
        </div>

        {/* Categoria select column */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Categoria</label>
          <CustomSelect
            options={filterCategoryOptions}
            value={filterCategory}
            onChange={setFilterCategory}
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
        <div className="flex-1 min-w-[200px] lg:max-w-[260px]">
          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs font-semibold">Status</label>
          <div className="relative inline-flex p-1 bg-surface-container-low border border-transparent rounded-lg h-[42px] items-center w-full select-none">
            {/* Sliding background indicator */}
            <div 
              className="absolute top-1 bottom-1 bg-surface-container-lowest rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-outline-variant/15 transition-all duration-300 ease-out"
              style={{
                width: 'calc((100% - 8px) / 3)',
                left: filterStatus === 'all' 
                  ? '4px' 
                  : filterStatus === 'paid' 
                    ? 'calc(4px + (100% - 8px) / 3)' 
                    : 'calc(4px + 2 * (100% - 8px) / 3)'
              }}
            />
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`relative z-10 flex-1 h-full rounded-md text-label-sm font-semibold transition-colors duration-200 select-none cursor-pointer text-center flex items-center justify-center ${
                filterStatus === 'all'
                  ? 'text-secondary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('paid')}
              className={`relative z-10 flex-1 h-full rounded-md text-label-sm font-semibold transition-colors duration-200 select-none cursor-pointer text-center flex items-center justify-center ${
                filterStatus === 'paid'
                  ? 'text-secondary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              Pagas
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`relative z-10 flex-1 h-full rounded-md text-label-sm font-semibold transition-colors duration-200 select-none cursor-pointer text-center flex items-center justify-center ${
                filterStatus === 'pending'
                  ? 'text-secondary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high bg-surface-container-low text-label-sm font-label-sm text-on-surface-variant select-none">
                <th className="py-md px-md font-medium uppercase tracking-wider whitespace-nowrap">Data</th>
                <th className="py-md px-md font-medium uppercase tracking-wider">Descrição</th>
                <th className="py-md px-md font-medium uppercase tracking-wider whitespace-nowrap">Categoria</th>
                <th className="py-md px-md font-medium uppercase tracking-wider whitespace-nowrap">Cartão</th>
                <th className="py-md px-md font-medium uppercase tracking-wider text-center whitespace-nowrap">Tipo Transação</th>
                <th className="py-md px-md font-medium uppercase tracking-wider text-right whitespace-nowrap">Valor</th>
                <th className="py-md px-sm font-medium uppercase tracking-wider text-center whitespace-nowrap">Status</th>
                <th className="py-md px-md font-medium uppercase tracking-wider text-right whitespace-nowrap">Compartilhado</th>
                <th className="py-md px-sm text-center whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="text-body-md font-body-md text-on-surface divide-y divide-surface-container-high">
              {filteredTransactions.map((tx) => {
                const isExpanded = expandedTxIds.has(tx.id);
                return (
                  <React.Fragment key={tx.id}>
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-md px-md whitespace-nowrap text-on-surface-variant font-medium">
                        {(() => {
                          const filter = getFilterMonthYear(filterMonth);
                          if (filter && tx.recurrenceType && tx.recurrenceType !== 'none') {
                            const inst = tx.installments?.find(
                              i => {
                                const instPurchase = getInstallmentPurchaseDate(tx, i);
                                return instPurchase.month === filter.month && instPurchase.year === filter.year;
                              }
                            );
                            if (inst) {
                              const iIdx = inst.installmentNumber - (tx.installmentStart || 1) + 1;
                              const [year, month, day] = tx.purchaseDate.split('-').map(Number);
                              const instDate = new Date(Date.UTC(year, month - 1, day));
                              if (tx.recurrencePeriod === 'daily') {
                                instDate.setUTCDate(instDate.getUTCDate() + (iIdx - 1));
                              } else if (tx.recurrencePeriod === 'weekly') {
                                instDate.setUTCDate(instDate.getUTCDate() + (iIdx - 1) * 7);
                              } else if (tx.recurrencePeriod === 'biweekly') {
                                instDate.setUTCDate(instDate.getUTCDate() + (iIdx - 1) * 15);
                              } else { // monthly
                                instDate.setUTCMonth(instDate.getUTCMonth() + (iIdx - 1));
                              }
                              return formatCalendarDate(instDate.toISOString().split('T')[0]);
                            }
                          }
                          return formatCalendarDate(tx.purchaseDate);
                        })()}
                      </td>
                      <td className="py-md px-md font-bold text-on-surface">
                        <div className="flex flex-col">
                          <span>{tx.description}</span>
                        </div>
                      </td>
                      <td className="py-md px-md whitespace-nowrap">
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
                      <td className="py-md px-md whitespace-nowrap">
                        <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md bg-surface-container text-on-surface-variant text-[10px] font-bold border border-outline-variant/30 select-none uppercase">
                          <span 
                            className="material-symbols-outlined text-[14px]"
                            style={{ color: tx.card.color || bankPresets[tx.card.bankName] || '#712ae2' }}
                          >
                            credit_card
                          </span>
                          {tx.card.name}
                        </span>
                      </td>
                      <td className="py-md px-md text-center whitespace-nowrap">
                        {getTransactionTypeBadge(tx)}
                      </td>
                      <td className="py-md px-md text-right font-bold text-on-surface whitespace-nowrap">
                        R$ {(() => {
                          const filter = getFilterMonthYear(filterMonth);
                          if (filter) {
                            const inst = tx.installments?.find(
                              i => {
                                const instPurchase = getInstallmentPurchaseDate(tx, i);
                                return instPurchase.month === filter.month && instPurchase.year === filter.year;
                              }
                            );
                            if (inst) return inst.amount;
                          }
                          return tx.amountTotal;
                        })().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-md px-sm text-center whitespace-nowrap">
                        {(() => {
                          const filter = getFilterMonthYear(filterMonth);
                          let isPaid = false;
                          if (filter) {
                            const inst = tx.installments?.find(
                              i => {
                                const instPurchase = getInstallmentPurchaseDate(tx, i);
                                return instPurchase.month === filter.month && instPurchase.year === filter.year;
                              }
                            );
                            isPaid = inst?.status === 'paid';
                          } else {
                            isPaid = tx.installments && tx.installments.length > 0 && tx.installments.every(i => i.status === 'paid');
                          }
                          return (
                            <span 
                              className={`material-symbols-outlined text-[20px] ${
                                isPaid ? 'text-tertiary-container opacity-85' : 'text-on-surface-variant opacity-30'
                              }`}
                              title={isPaid ? 'Pago' : 'Pendente'}
                            >
                              {isPaid ? 'check_circle' : 'hourglass_empty'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-md px-md text-right whitespace-nowrap">
                        {(() => {
                          const filter = getFilterMonthYear(filterMonth);
                          if (filter) {
                            const inst = tx.installments?.find(
                              i => {
                                const instPurchase = getInstallmentPurchaseDate(tx, i);
                                return instPurchase.month === filter.month && instPurchase.year === filter.year;
                              }
                            );
                            if (inst && inst.splits && inst.splits.length > 0) {
                              const instSplitsSum = inst.splits.reduce((sum, s) => sum + s.amount, 0);
                              return (
                                <div className="inline-flex flex-col items-end">
                                  <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md bg-secondary-fixed/50 text-on-secondary-fixed-variant text-[10px] font-bold border border-secondary-fixed-dim/20 select-none">
                                    <span className="material-symbols-outlined text-[14px]">call_split</span>
                                    + R$ {instSplitsSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber
                                  </span>
                                </div>
                              );
                            }
                            return <span className="text-on-surface-variant opacity-30 select-none">-</span>;
                          }

                          if (tx.splits && tx.splits.length > 0) {
                            return (
                              <div className="inline-flex flex-col items-end">
                                <span className="inline-flex items-center gap-xs px-2 py-1 rounded-md bg-secondary-fixed/50 text-on-secondary-fixed-variant text-[10px] font-bold border border-secondary-fixed-dim/20 select-none">
                                  <span className="material-symbols-outlined text-[14px]">call_split</span>
                                  + R$ {tx.splits.reduce((sum, s) => sum + s.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber
                                </span>
                              </div>
                            );
                          }
                          return <span className="text-on-surface-variant opacity-30 select-none">-</span>;
                        })()}
                      </td>
                      <td className="py-md px-sm text-center whitespace-nowrap">
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
                            onClick={() => handleEditClick(tx)}
                            className="p-[6px] text-on-surface-variant hover:text-secondary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                            title="Editar Transação"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(tx)}
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
                                .filter((inst) => {
                                  const filter = getFilterMonthYear(filterMonth);
                                  if (!filter) return true;
                                  const instPurchase = getInstallmentPurchaseDate(tx, inst);
                                  return instPurchase.month === filter.month && instPurchase.year === filter.year;
                                })
                                .sort((a, b) => a.installmentNumber - b.installmentNumber)
                                .map((inst) => (
                                  <div key={inst.id} className="p-sm bg-surface border border-outline-variant/30 rounded-lg flex flex-col justify-between min-h-[90px] space-y-sm">
                                    <div>
                                      <div className="flex justify-between items-center text-[9px] font-semibold">
                                        <span className="text-on-surface-variant font-bold">
                                          {(tx.recurrenceType === 'fixed' || tx.recurrenceType === 'fixed_ended')
                                            ? 'Mensal Recorrente'
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
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-start justify-center overflow-y-auto p-md md:p-lg animate-fade-in">
          
          {/* Modal Content container — grows naturally with content */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl w-full max-w-[600px] relative my-auto">
            
             {/* Header */}
            <div className="p-lg border-b border-outline-variant/20 rounded-t-xl bg-surface-container-lowest">
              <button 
                type="button"
                onClick={() => { setIsOpen(false); setTxToEdit(null); }}
                className="absolute top-md right-md text-on-surface-variant hover:bg-surface-container-low rounded-full w-8 h-8 flex items-center justify-center transition-colors cursor-pointer z-10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <h3 className="text-headline-md font-headline-md text-primary font-bold">
                {txToEdit ? 'Editar Transação' : 'Nova Transação'}
              </h3>
              <p className="text-label-md font-label-md text-on-surface-variant mt-xs">
                {txToEdit ? 'Altere as informações desta transação.' : 'Registre um novo gasto manual ou compartilhado.'}
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={txToEdit ? handleSaveEditedTransaction : handleAddTransaction}>
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
                    <DatePicker 
                      value={purchaseDate}
                      onChange={setPurchaseDate}
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
                      disabled={txToEdit !== null}
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
                          className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-low"
                        />
                      </div>

                      {/* Período de Repetição */}
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Período de Repetição</label>
                        <CustomSelect
                          options={recurrencePeriodOptions}
                          value={recurrencePeriod}
                          onChange={setRecurrencePeriod}
                          disabled={txToEdit !== null}
                        />
                      </div>

                      {/* Parcela Inicial */}
                      <div>
                        <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Parcela Atual</label>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          required
                          value={installmentStart}
                          onChange={(e) => setInstallmentStart(e.target.value)}
                          className="w-full bg-surface border border-outline-variant text-body-md font-body-md text-on-surface rounded-lg py-sm px-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-container-low"
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
                        <div className="w-full sm:w-1/2">
                          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Devedor</label>
                          <CustomSelect
                            options={debtorOptions}
                            value={selectedDebtorId}
                            onChange={setSelectedDebtorId}
                            className="h-[42px]"
                          />
                        </div>
                        
                        <div className="w-full sm:w-5/12">
                          <label className="block text-label-sm font-label-sm text-on-surface-variant mb-xs">Valor (R$)</label>
                          <div className="relative">
                            <span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant font-medium select-none text-body-md">R$</span>
                            <input
                              type="text"
                              placeholder="0,00"
                              value={splitDebtorAmountFormatted}
                              onChange={(e) => handleSplitAmountChange(e.target.value)}
                              className="w-full pl-[2.8rem] pr-md py-sm bg-surface border border-outline-variant rounded-lg text-body-md font-body-md text-on-surface outline-none focus:ring-2 focus:ring-secondary focus:border-secondary shadow-sm transition-all h-[42px]"
                            />
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleAddSplit}
                          className="w-full sm:w-auto px-lg bg-secondary text-on-secondary rounded-lg font-label-md text-label-md transition-all cursor-pointer flex items-center justify-center gap-xs h-[42px] shadow-sm hover:opacity-90 active:scale-95 shrink-0"
                        >
                          <span className="material-symbols-outlined text-label-md">add</span>
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
                  onClick={() => { setIsOpen(false); setTxToEdit(null); }}
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

      {/* Modal para exclusão de despesa recorrente */}
      {mounted && isDeleteModalOpen && txToDelete && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[110] flex items-center justify-center p-md animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl w-full max-w-[480px] p-lg space-y-md">
            <h3 className="text-headline-sm font-bold text-error flex items-center gap-xs whitespace-normal">
              <span className="material-symbols-outlined text-error">warning</span>
              Excluir Despesa Recorrente
            </h3>
            
            <p className="text-body-sm text-on-surface-variant whitespace-normal">
              A despesa <strong>{txToDelete.description}</strong> é uma assinatura mensal recorrente. Como você deseja realizar a exclusão?
            </p>
            
            <div className="flex flex-col gap-sm pt-sm">
              <button
                type="button"
                onClick={async () => {
                  setIsDeleteModalOpen(false);
                  const filter = getFilterMonthYear(filterMonth);
                  if (filter) {
                    await handleDeleteTransaction(txToDelete.id, 'future', filter.month, filter.year);
                  }
                }}
                className="w-full py-sm px-md bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface font-semibold rounded-lg text-xs transition-all text-left flex items-start gap-sm cursor-pointer whitespace-normal"
              >
                <span className="material-symbols-outlined text-secondary shrink-0 mt-0.5">arrow_forward</span>
                <div className="whitespace-normal">
                  <p className="font-bold text-on-surface text-xs whitespace-normal">Excluir a partir do mês selecionado</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 whitespace-normal">Exclui esta mensalidade e todas as faturas futuras. O histórico de faturas passadas será mantido.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsDeleteModalOpen(false);
                  await handleDeleteTransaction(txToDelete.id, 'all');
                }}
                className="w-full py-sm px-md bg-error-container/20 border border-error/20 hover:bg-error-container/40 text-on-surface font-semibold rounded-lg text-xs transition-all text-left flex items-start gap-sm cursor-pointer whitespace-normal"
              >
                <span className="material-symbols-outlined text-error shrink-0 mt-0.5">delete</span>
                <div className="whitespace-normal">
                  <p className="font-bold text-error text-xs whitespace-normal">Excluir tudo (histórico completo)</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 whitespace-normal">Apaga completamente todos os registros desta despesa, incluindo todas as faturas anteriores.</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-sm border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTxToDelete(null);
                }}
                className="px-md py-base hover:bg-surface-container-low rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal para seleção do escopo de edição de despesa recorrente */}
      {mounted && isEditScopeModalOpen && txToEdit && pendingEditData && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[110] flex items-center justify-center p-md animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl w-full max-w-[480px] p-lg space-y-md">
            <h3 className="text-headline-sm font-bold text-primary flex items-center gap-xs whitespace-normal">
              <span className="material-symbols-outlined text-primary">edit_square</span>
              Editar Transação Recorrente
            </h3>
            
            <p className="text-body-sm text-on-surface-variant whitespace-normal">
              A transação <strong>{txToEdit.description}</strong> é recorrente. Como você deseja aplicar as alterações feitas?
            </p>
            
            <div className="flex flex-col gap-sm pt-sm">
              <button
                type="button"
                onClick={async () => {
                  await executeEditTransaction(txToEdit.id, {
                    ...pendingEditData,
                    editScope: 'only_this',
                  });
                }}
                className="w-full py-sm px-md bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface font-semibold rounded-lg text-xs transition-all text-left flex items-start gap-sm cursor-pointer whitespace-normal animate-fade-in"
              >
                <span className="material-symbols-outlined text-secondary shrink-0 mt-0.5">event</span>
                <div className="whitespace-normal">
                  <p className="font-bold text-on-surface text-xs whitespace-normal">Apenas esta parcela</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 whitespace-normal">Aplica as alterações somente a este mês selecionado ({getFilterMonthYear(filterMonth)?.month.toString().padStart(2, '0')}/{getFilterMonthYear(filterMonth)?.year}). Outros meses não serão afetados.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await executeEditTransaction(txToEdit.id, {
                    ...pendingEditData,
                    editScope: 'from_this_forward',
                  });
                }}
                className="w-full py-sm px-md bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface font-semibold rounded-lg text-xs transition-all text-left flex items-start gap-sm cursor-pointer whitespace-normal animate-fade-in"
              >
                <span className="material-symbols-outlined text-secondary shrink-0 mt-0.5">arrow_forward</span>
                <div className="whitespace-normal">
                  <p className="font-bold text-on-surface text-xs whitespace-normal">Daqui em diante</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 whitespace-normal">Aplica as alterações para este mês e todos os meses futuros. As parcelas anteriores serão preservadas.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await executeEditTransaction(txToEdit.id, {
                    ...pendingEditData,
                    editScope: 'all',
                  });
                }}
                className="w-full py-sm px-md bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface font-semibold rounded-lg text-xs transition-all text-left flex items-start gap-sm cursor-pointer whitespace-normal animate-fade-in"
              >
                <span className="material-symbols-outlined text-secondary shrink-0 mt-0.5">all_inclusive</span>
                <div className="whitespace-normal">
                  <p className="font-bold text-on-surface text-xs whitespace-normal">Todas as parcelas</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5 whitespace-normal">Aplica as alterações a todo o histórico de parcelas desta transação (passadas e futuras).</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-sm border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setIsEditScopeModalOpen(false);
                  setPendingEditData(null);
                }}
                className="px-md py-base hover:bg-surface-container-low rounded-lg text-xs font-bold text-on-surface-variant cursor-pointer transition-colors"
              >
                Voltar ao formulário
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
