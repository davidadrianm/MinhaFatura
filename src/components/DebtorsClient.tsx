'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomSelect, { SelectOption } from './CustomSelect';

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

interface TransactionDetail {
  description: string;
  purchaseDate: string;
  installmentsCount: number;
}

interface CardDetail {
  name: string;
}

interface InstallmentDetail {
  id: string;
  installmentNumber: number;
  amount: number;
  dueMonth: number;
  dueYear: number;
  status: string;
  debtorAmount: number;
  debtorPaid: boolean;
  debtorPaidAt?: string | null;
  transaction: TransactionDetail;
  card: CardDetail;
}

interface Debtor {
  id: string;
  name: string;
  pendingAmount: number;
  totalAmount: number;
  installmentsCount: number;
  installments: InstallmentDetail[];
}

interface DebtorsClientProps {
  initialDebtors: Debtor[];
}

export default function DebtorsClient({ initialDebtors }: DebtorsClientProps) {
  const [debtors, setDebtors] = useState<Debtor[]>(initialDebtors);
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(
    initialDebtors[0]?.id || null
  );
  
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Filtros de busca no cliente
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [filterMonth, setFilterMonth] = useState('this-month');

  const router = useRouter();

  const selectedDebtor = debtors.find(d => d.id === selectedDebtorId);

  const handleAddDebtor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/debtors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao cadastrar devedor.');
      } else {
        setName('');
        const fetchRes = await fetch('/api/debtors');
        const fetchData = await fetchRes.json();
        if (fetchData.success) {
          router.refresh();
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      }
    } catch (err) {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDebtor = async (debtorId: string) => {
    const debtorToDelete = debtors.find(d => d.id === debtorId);
    if (!debtorToDelete) return;

    if (debtorToDelete.totalAmount > 0) {
      alert(`Não é possível excluir este devedor pois existem compras ativas atreladas a ele.`);
      return;
    }

    if (!confirm(`Deseja remover ${debtorToDelete.name} do sistema?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/debtors/${debtorId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const remaining = debtors.filter(d => d.id !== debtorId);
        setDebtors(remaining);
        if (selectedDebtorId === debtorId) {
          setSelectedDebtorId(remaining[0]?.id || null);
        }
        router.refresh();
      } else {
        alert(data.error || 'Erro ao excluir devedor.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  const handleTogglePaid = async (splitId: string) => {
    setTogglingId(splitId);
    try {
      const res = await fetch(`/api/installments/split/${splitId}/pay`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDebtors(debtors.map(d => {
          if (d.id === selectedDebtorId) {
            const updatedInsts = d.installments.map(inst => {
              if (inst.id === splitId) {
                return { ...inst, debtorPaid: data.paid, debtorPaidAt: data.paidAt };
              }
              return inst;
            });
            
            const newPending = updatedInsts
              .filter(i => !i.debtorPaid)
              .reduce((s, i) => s + i.debtorAmount, 0);

            return {
              ...d,
              installments: updatedInsts,
              pendingAmount: newPending
            };
          }
          return d;
        }));
        router.refresh();
      } else {
        alert(data.error || 'Erro ao alterar status.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    } finally {
      setTogglingId(null);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return months[month - 1];
  };

  // Cálculos gerais de resumo (Bento Cards)
  const totalReceber = debtors.reduce((sum, d) => sum + d.pendingAmount, 0);
  const totalRecebido = debtors.reduce((sum, d) => sum + (d.totalAmount - d.pendingAmount), 0);
  const totalGeral = debtors.reduce((sum, d) => sum + d.totalAmount, 0);
  const percentConcluido = totalGeral > 0 ? (totalRecebido / totalGeral) * 100 : 0;

  // Filtragem local das parcelas do devedor selecionado
  const getFilteredInstallments = (insts: InstallmentDetail[]) => {
    return insts.filter(inst => {
      const matchesSearch = inst.transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'pending' && !inst.debtorPaid) ||
        (statusFilter === 'paid' && inst.debtorPaid);
      const matchesMonth = matchMonthFilter(filterMonth, inst.dueMonth, inst.dueYear);
      return matchesSearch && matchesStatus && matchesMonth;
    });
  };

  return (
    <div className="space-y-lg">
      
      {/* Summary Cards (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        
        {/* Total a Receber */}
        <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-6xl text-secondary">account_balance</span>
          </div>
          <div>
            <h3 className="text-label-md font-label-md text-on-surface-variant mb-2 font-medium">Total a Receber</h3>
            <div className="text-display-currency font-display-currency text-primary">
              R$ {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-label-sm font-label-sm">
            <span className="text-on-surface-variant">Valor total compartilhado</span>
            <span className="material-symbols-outlined text-secondary text-sm">trending_up</span>
          </div>
        </div>

        {/* Recebido */}
        <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-6xl text-tertiary-container">check_circle</span>
          </div>
          <div>
            <h3 className="text-label-md font-label-md text-on-surface-variant mb-2 font-medium">Total Recebido</h3>
            <div className="text-display-currency font-display-currency text-on-tertiary-container">
              R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-on-tertiary-container rounded-full transition-all" style={{ width: `${percentConcluido}%` }}></div>
            </div>
            <div className="text-label-sm font-label-sm text-on-surface-variant mt-2 text-right">{percentConcluido.toFixed(0)}% Concluído</div>
          </div>
        </div>

        {/* Pendente */}
        <div className="bg-surface-container-lowest rounded-xl p-lg shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 flex flex-col justify-between relative overflow-hidden hover:-translate-y-0.5 transition-transform duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-6xl text-error">hourglass_empty</span>
          </div>
          <div>
            <h3 className="text-label-md font-label-md text-on-surface-variant mb-2 font-medium">Total Pendente</h3>
            <div className="text-display-currency font-display-currency text-on-surface">
              R$ {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center justify-between text-label-sm font-label-sm">
            <span className="text-error font-medium flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">warning</span>
              Aguardando pagamento
            </span>
          </div>
        </div>

      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        
        {/* Left: Devedores List & Create Form */}
        <div className="space-y-md">
          {/* Create Form */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <h3 className="text-label-sm font-bold text-on-surface-variant mb-3 flex items-center gap-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Novo Devedor
            </h3>

            {error && (
              <div className="mb-3 bg-error-container text-on-error-container text-xs px-3 py-2.5 rounded-lg border border-error/15 flex items-center gap-xs">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddDebtor} className="flex gap-sm">
              <input
                type="text"
                required
                placeholder="Nome (Ex: Leticia)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="py-2 px-4 bg-secondary text-on-secondary disabled:opacity-50 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                {loading ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : 'Adicionar'}
              </button>
            </form>
          </div>

          {/* Devedores List */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-md">
            <h3 className="text-label-sm font-bold text-on-surface-variant flex items-center gap-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-secondary">group</span>
              Contatos cadastrados
            </h3>

            {debtors.length === 0 ? (
              <div className="text-center py-8 text-xs text-on-surface-variant opacity-60 font-medium">
                Nenhum devedor cadastrado.
              </div>
            ) : (
              <div className="space-y-xs">
                {debtors.map((d) => {
                  const isSelected = selectedDebtorId === d.id;
                  const initials = d.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                  
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDebtorId(d.id)}
                      className={`p-sm rounded-lg flex items-center justify-between border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-secondary-fixed/30 border-secondary/35 text-secondary' 
                          : 'bg-surface border-outline-variant/35 text-on-surface hover:border-outline hover:bg-surface-container-low/40'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-sm">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-md font-bold truncate text-on-surface">{d.name}</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">
                            Total: R$ {d.totalAmount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-sm shrink-0">
                        <div className="text-right">
                          <p className={`text-xs font-black ${d.pendingAmount > 0 ? 'text-secondary' : 'text-on-tertiary-container'}`}>
                            R$ {d.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[8px] text-on-surface-variant uppercase tracking-wider font-bold">Pendente</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDebtor(d.id);
                          }}
                          disabled={d.totalAmount > 0}
                          className={`p-xs rounded-lg transition-colors border ${
                            d.totalAmount > 0
                              ? 'text-on-surface-variant/20 border-transparent cursor-not-allowed opacity-30'
                              : 'text-on-surface-variant hover:text-error hover:bg-error-container/40 border-transparent hover:border-error-container'
                          }`}
                          title={d.totalAmount > 0 ? "Existem compras atreladas" : "Remover Devedor"}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Installments Breakdown */}
        <div className="lg:col-span-2 space-y-md">
          {selectedDebtor ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-md">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-sm border-b border-outline-variant/20">
                <div>
                  <h2 className="text-headline-md font-bold text-on-surface">{selectedDebtor.name}</h2>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">Acompanhamento de despesas compartilhadas ativas.</p>
                </div>
                <div className="text-right bg-surface-container-low border border-outline-variant/35 px-sm py-xs rounded-lg">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Saldo Pendente</span>
                  <span className="text-headline-md font-black text-secondary">
                    R$ {selectedDebtor.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Filters for Selected Debtor Installments */}
              <div className="flex flex-col sm:flex-row gap-sm items-start sm:items-center justify-between py-xs border-b border-outline-variant/10 w-full">
                <div className="flex flex-col sm:flex-row gap-sm items-stretch sm:items-center w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <input
                      type="text"
                      placeholder="Buscar por descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg pl-8 pr-3 py-1 text-label-md text-on-surface outline-none"
                    />
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                  </div>
                  
                  <div className="w-full sm:w-48">
                    <CustomSelect
                      options={monthFilterOptions}
                      value={filterMonth}
                      onChange={setFilterMonth}
                    />
                  </div>
                </div>

                <div className="flex gap-xs shrink-0 select-none">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                      statusFilter === 'all' 
                        ? 'bg-secondary text-on-secondary border-transparent' 
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                      statusFilter === 'pending' 
                        ? 'bg-secondary text-on-secondary border-transparent' 
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    Pendentes
                  </button>
                  <button
                    onClick={() => setStatusFilter('paid')}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                      statusFilter === 'paid' 
                        ? 'bg-secondary text-on-secondary border-transparent' 
                        : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    Recebidos
                  </button>
                </div>
              </div>

              {/* Installments List */}
              <div className="space-y-sm max-h-[500px] overflow-y-auto pr-xs">
                {getFilteredInstallments(selectedDebtor.installments).map((inst) => {
                  const isToggling = togglingId === inst.id;
                  const debtorPaid = inst.debtorPaid;
                  
                  return (
                    <div 
                      key={inst.id} 
                      className={`p-sm rounded-xl border flex justify-between items-center transition-all ${
                        debtorPaid
                          ? 'bg-surface-container-low/40 border-outline-variant/20 opacity-70'
                          : 'bg-surface border-outline-variant/35 hover:border-outline-variant/80'
                      }`}
                    >
                      <div className="min-w-0 flex items-start gap-sm">
                        <div className="mt-1 shrink-0">
                          <span className={`material-symbols-outlined text-[20px] ${
                            debtorPaid ? 'text-on-tertiary-container' : 'text-secondary'
                          }`}>
                            {debtorPaid ? 'check_circle' : 'hourglass_empty'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-body-md font-bold truncate text-on-surface ${debtorPaid ? 'line-through opacity-70' : ''}`}>
                            {inst.transaction.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-[2px] text-[10px] text-on-surface-variant font-semibold mt-0.5">
                            <span className="text-on-surface-variant">{inst.card.name}</span>
                            <span>•</span>
                            <span>Parc {inst.installmentNumber}/{inst.transaction.installmentsCount}</span>
                            <span>•</span>
                            <span className="flex items-center gap-[2px]">
                              <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                              Ref: {getMonthName(inst.dueMonth)}/{inst.dueYear}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-md shrink-0">
                        <div className="text-right">
                          <p className={`text-body-md font-bold ${
                            debtorPaid ? 'text-on-tertiary-container/70 line-through' : 'text-secondary'
                          }`}>
                            R$ {inst.debtorAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          {debtorPaid && inst.debtorPaidAt && (
                            <p className="text-[8px] text-on-surface-variant font-medium">
                              Pago em {new Date(inst.debtorPaidAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>

                        {isToggling ? (
                          <span className="material-symbols-outlined animate-spin text-secondary text-[20px]">progress_activity</span>
                        ) : (
                          <button
                            onClick={() => handleTogglePaid(inst.id)}
                            className={`px-sm py-xs text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                              debtorPaid
                                ? 'bg-surface-container-high border-outline-variant/35 text-on-surface-variant hover:text-error hover:border-error/20'
                                : 'bg-secondary text-on-secondary border-transparent hover:opacity-90 shadow-sm'
                            }`}
                          >
                            {debtorPaid ? 'Estornar' : 'Recebido'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {getFilteredInstallments(selectedDebtor.installments).length === 0 && (
                  <p className="text-center py-10 text-xs text-on-surface-variant opacity-60 font-medium">
                    Nenhuma parcela encontrada para os filtros selecionados.
                  </p>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-16 text-center space-y-sm shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-zinc-900/10">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-50">group</span>
              <h3 className="text-body-md font-bold text-on-surface-variant">Nenhum Devedor Selecionado</h3>
              <p className="text-label-sm text-on-surface-variant max-w-sm mx-auto opacity-70">
                Cadastre ou selecione um devedor no painel lateral para visualizar e gerenciar os reembolsos pendentes.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
