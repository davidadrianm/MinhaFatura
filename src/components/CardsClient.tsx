'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomSelect, { SelectOption } from './CustomSelect';

const bankOptions: SelectOption[] = [
  { value: 'Nubank', label: 'Nubank', icon: 'account_balance' },
  { value: 'Itaú', label: 'Itaú', icon: 'account_balance' },
  { value: 'Santander', label: 'Santander', icon: 'account_balance' },
  { value: 'Bradesco', label: 'Bradesco', icon: 'account_balance' },
  { value: 'C6 Bank', label: 'C6 Bank', icon: 'account_balance' },
  { value: 'Inter', label: 'Inter', icon: 'account_balance' },
  { value: 'Banco do Brasil', label: 'Banco do Brasil', icon: 'account_balance' },
  { value: 'Outro', label: 'Outro', icon: 'account_balance' },
];

const brandOptions: SelectOption[] = [
  { value: 'Mastercard', label: 'Mastercard', icon: 'credit_card' },
  { value: 'Visa', label: 'Visa', icon: 'credit_card' },
  { value: 'Elo', label: 'Elo', icon: 'credit_card' },
  { value: 'Amex', label: 'Amex', icon: 'credit_card' },
];

const bankPresets: { [key: string]: string } = {
  'Nubank': '#8D0DE3',
  'Itaú': '#FF6200',
  'Santander': '#EC0000',
  'Bradesco': '#CA0A37',
  'C6 Bank': '#FBFBFB',
  'Inter': '#F27321',
  'Banco do Brasil': '#FCFC30',
};

const isLightColor = (hexColor: string) => {
  const hex = hexColor.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150;
};

const getCardStyle = (bank: string, brand: string, cardColor?: string) => {
  const colorVal = cardColor || bankPresets[bank] || '#712ae2';
  const isLight = isLightColor(colorVal);
  
  const textColorClass = isLight ? 'text-[#1C1B1F]' : 'text-white';
  const tagBgClass = isLight ? 'bg-black/10 border-black/20' : 'bg-white/10 border-white/30';
  const chipLogoBgClass = isLight ? 'bg-black/15' : 'bg-white/20';
  
  // Renderiza um logo simplificado e premium para cada bandeira usando SVGs reais
  let fakeLogo;
  const brandName = brand.toLowerCase();
  
  if (brandName === 'visa') {
    const visaColor = isLight ? '#1A1F71' : '#FFFFFF';
    fakeLogo = (
      <svg viewBox="0 0 24 24" width="36" height="24" fill={visaColor} xmlns="http://www.w3.org/2000/svg" className="shrink-0 select-none">
        <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>
      </svg>
    );
  } else if (brandName === 'mastercard') {
    fakeLogo = (
      <svg viewBox="0 0 36 24" width="36" height="24" xmlns="http://www.w3.org/2000/svg" className="shrink-0 select-none">
        <circle cx="13" cy="12" r="10" fill="#EB001B" />
        <circle cx="23" cy="12" r="10" fill="#F79E1B" fillOpacity="0.8" />
      </svg>
    );
  } else if (brandName === 'elo') {
    const eloColor = isLight ? '#1C1B1F' : '#FFFFFF';
    fakeLogo = (
      <svg viewBox="0 0 42 24" width="42" height="24" xmlns="http://www.w3.org/2000/svg" className="shrink-0 select-none">
        <text x="3" y="16" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="12" fill={eloColor}>elo</text>
        <circle cx="22" cy="12" r="3.5" fill="#F5A623" />
        <circle cx="28" cy="12" r="3.5" fill="#D0021B" />
        <circle cx="34" cy="12" r="3.5" fill="#4A90E2" />
      </svg>
    );
  } else if (brandName === 'amex') {
    fakeLogo = (
      <svg viewBox="0 0 36 24" width="36" height="24" xmlns="http://www.w3.org/2000/svg" className="shrink-0 select-none">
        <rect width="36" height="24" rx="4" fill="#0070CD" />
        <text x="18" y="15" fontFamily="monospace" fontSize="8" fontWeight="900" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.5">AMEX</text>
      </svg>
    );
  } else {
    fakeLogo = (
      <span className="material-symbols-outlined text-[20px] opacity-70">credit_card</span>
    );
  }
  
  return {
    bgStyle: { backgroundColor: colorVal },
    textColorClass,
    tagBg: tagBgClass,
    chipLogoBg: chipLogoBgClass,
    fakeLogo
  };
};

interface CardWithInvoices {
  id: string;
  name: string;
  bankName: string;
  brand: string;
  lastDigits: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color?: string;
  parentCardId?: string | null;
  invoices: {
    totalAmount: number;
  }[];
}

interface CardsClientProps {
  initialCards: CardWithInvoices[];
}

export default function CardsClient({ initialCards }: CardsClientProps) {
  const [cards, setCards] = useState<CardWithInvoices[]>(initialCards);
  const [editingCard, setEditingCard] = useState<CardWithInvoices | null>(null);
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('Nubank');
  const [brand, setBrand] = useState('Mastercard');
  const [limit, setLimit] = useState('');
  const [limitFormatted, setLimitFormatted] = useState('');
  
  const handleLimitChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) {
      setLimit('');
      setLimitFormatted('');
      return;
    }
    const numValue = parseInt(digits, 10) / 100;
    setLimit(numValue.toFixed(2));
    setLimitFormatted(
      numValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [color, setColor] = useState('#8D0DE3'); // Preset for Nubank
  const [shareLimit, setShareLimit] = useState(false);
  const [parentCardId, setParentCardId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleBankChange = (newBank: string) => {
    setBankName(newBank);
    if (newBank !== 'Outro') {
      setColor(bankPresets[newBank] || '#712ae2');
    }
  };

  const handleStartEdit = (card: CardWithInvoices) => {
    setEditingCard(card);
    setName(card.name);
    setBankName(card.bankName);
    setBrand(card.brand);
    setLimit(card.limit.toFixed(2));
    setLimitFormatted(card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setClosingDay(card.closingDay.toString());
    setDueDay(card.dueDay.toString());
    setColor(card.color || bankPresets[card.bankName] || '#712ae2');
    setShareLimit(!!card.parentCardId);
    setParentCardId(card.parentCardId || '');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingCard(null);
    setName('');
    setBankName('Nubank');
    setBrand('Mastercard');
    setLimit('');
    setLimitFormatted('');
    setClosingDay('25');
    setDueDay('5');
    setColor('#8D0DE3');
    setShareLimit(false);
    setParentCardId('');
    setError('');
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (parseInt(closingDay) < 1 || parseInt(closingDay) > 31 || parseInt(dueDay) < 1 || parseInt(dueDay) > 31) {
      setError('Os dias de fechamento e vencimento devem ser entre 1 e 31');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bankName,
          brand,
          lastDigits: '0000',
          limit: shareLimit ? undefined : limit,
          closingDay,
          dueDay,
          color,
          parentCardId: shareLimit ? parentCardId : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao cadastrar cartão.');
      } else {
        setName('');
        setLimit('');
        setLimitFormatted('');
        setShareLimit(false);
        setParentCardId('');
        // Recarregar os cartões da API
        const fetchRes = await fetch('/api/cards');
        const fetchData = await fetchRes.json();
        if (fetchData.success) {
          router.refresh();
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setError('');
    setLoading(true);

    if (parseInt(closingDay) < 1 || parseInt(closingDay) > 31 || parseInt(dueDay) < 1 || parseInt(dueDay) > 31) {
      setError('Os dias de fechamento e vencimento devem ser entre 1 e 31');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/cards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bankName,
          brand,
          limit: shareLimit ? undefined : limit,
          closingDay,
          dueDay,
          color,
          parentCardId: shareLimit ? parentCardId : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Erro ao editar cartão.');
      } else {
        handleCancelEdit();
        router.refresh();
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Deseja arquivar este cartão? Ele será ocultado do sistema, mas seu histórico de faturas será preservado.')) {
      return;
    }

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCards(cards.filter(c => c.id !== cardId));
        if (editingCard?.id === cardId) {
          handleCancelEdit();
        }
        router.refresh();
      } else {
        alert(data.error || 'Erro ao arquivar cartão.');
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  const parentOptions = cards
    .filter(c => c.id !== editingCard?.id && !c.parentCardId)
    .map(c => ({
      value: c.id,
      label: `${c.bankName} - ${c.name} (R$ ${c.limit.toLocaleString('pt-BR')})`,
      icon: 'credit_card' as const
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
      
      {/* Left/Middle: Cards Grid */}
      <div className="lg:col-span-2 space-y-md">
        <h3 className="text-body-lg font-body-lg font-bold text-on-surface flex items-center gap-xs">
          <span className="material-symbols-outlined text-secondary text-2xl">credit_card</span>
          Cartões Cadastrados ({cards.length})
        </h3>

        {cards.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-outline-variant bg-surface rounded-xl space-y-3 p-lg">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-60">credit_card</span>
            <p className="text-body-md text-on-surface-variant font-medium">Nenhum cartão cadastrado ainda</p>
            <p className="text-label-sm text-on-surface-variant max-w-sm mx-auto opacity-70">
              Cadastre seu primeiro cartão no formulário ao lado para começar a registrar suas faturas e compras.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {cards.map((card) => {
              // Cálculos de limites compartilhados
              let displayLimit = card.limit;
              let displayLimitUsed = card.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
              let isShared = false;
              let sharedText = '';

              if (card.parentCardId) {
                const parent = cards.find(c => c.id === card.parentCardId);
                if (parent) {
                  const groupCards = cards.filter(c => c.id === parent.id || c.parentCardId === parent.id);
                  displayLimit = parent.limit;
                  displayLimitUsed = groupCards.reduce((sum, gc) => sum + gc.invoices.reduce((s, inv) => s + inv.totalAmount, 0), 0);
                  isShared = true;
                  sharedText = `Limite compartilhado com ${parent.name}`;
                }
              } else {
                const children = cards.filter(c => c.parentCardId === card.id);
                if (children.length > 0) {
                  const groupCards = [card, ...children];
                  displayLimit = card.limit;
                  displayLimitUsed = groupCards.reduce((sum, gc) => sum + gc.invoices.reduce((s, inv) => s + inv.totalAmount, 0), 0);
                  isShared = true;
                  sharedText = `Limite principal (${children.length} vinculados)`;
                }
              }

              const limitAvailable = displayLimit - displayLimitUsed;
              const percentageUsed = displayLimit > 0 ? (displayLimitUsed / displayLimit) * 100 : 0;
              const cardTheme = getCardStyle(card.bankName, card.brand, card.color);

              return (
                <div 
                  key={card.id} 
                  className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 flex flex-col gap-md hover:-translate-y-[2px] transition-transform duration-300"
                >
                  {/* Physical Card Representation */}
                  <div className={`${cardTheme.textColorClass} rounded-[16px] p-md aspect-[1.58] flex flex-col justify-between relative overflow-hidden shadow-sm`} style={cardTheme.bgStyle}>
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start z-10">
                      <span className="text-headline-md font-headline-md font-black tracking-tight">{card.bankName}</span>
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${cardTheme.tagBg}`}>
                        {card.name}
                      </span>
                    </div>

                    <div className="z-10 mt-auto">
                      <div className="mb-xs opacity-80">
                        <span className="material-symbols-outlined text-[32px]">memory</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-body-md tracking-widest font-mono select-none">
                          •••• •••• •••• ••••
                        </div>
                        {cardTheme.fakeLogo}
                      </div>
                    </div>
                  </div>

                  {/* Card Details & Progress */}
                  <div className="flex flex-col gap-xs px-xs">
                    <div className="flex justify-between items-end mb-1">
                      <div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Limite Disponível</p>
                        <p className="text-body-md font-semibold text-on-surface">R$ {limitAvailable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Limite em Uso</p>
                        <p className="text-body-md font-semibold text-on-surface">R$ {displayLimitUsed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-[6px] bg-surface-container-high rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${percentageUsed >= 90 ? 'bg-error' : 'bg-secondary'}`}
                        style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[11px] text-on-surface-variant mt-1 font-medium">
                      <span>{percentageUsed.toFixed(0)}% utilizado</span>
                      <span className="flex items-center gap-[2px]">
                        {isShared && (
                          <span className="material-symbols-outlined text-[12px] text-secondary">link</span>
                        )}
                        <span>Total: R$ {displayLimit.toLocaleString('pt-BR')}</span>
                      </span>
                    </div>

                    {isShared && (
                      <div className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 rounded px-2 py-0.5 font-bold self-start mt-1 flex items-center gap-[2px]">
                        <span className="material-symbols-outlined text-[12px]">share</span>
                        <span>{sharedText}</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <hr className="border-outline-variant/30 border-t mx-xs" />

                  {/* Dates & Actions */}
                  <div className="flex justify-between items-center px-xs pb-xs">
                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-outline text-[18px]">calendar_today</span>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">Fechamento</span>
                        <span className="text-label-sm text-on-surface font-semibold">Dia {card.closingDay}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-xs">
                      <span className="material-symbols-outlined text-outline text-[18px]">event</span>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">Vencimento</span>
                        <span className="text-label-sm text-on-surface font-semibold">Dia {card.dueDay}</span>
                      </div>
                    </div>

                    <div className="flex gap-xs">
                      <button
                        onClick={() => handleStartEdit(card)}
                        className="p-[6px] text-on-surface-variant hover:text-secondary hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                        title="Editar Cartão"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-[6px] text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-lg transition-colors cursor-pointer"
                        title="Arquivar Cartão"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Add/Edit Form & Preview */}
      <div className="space-y-md">
        <h3 className="text-body-lg font-body-lg font-bold text-on-surface">
          {editingCard ? `Editar Cartão: ${editingCard.name}` : 'Cadastrar Novo Cartão'}
        </h3>

        {/* Realtime visual preview */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-sm">
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider text-center">Visualização do Cartão</p>
          
          {(() => {
            const previewTheme = getCardStyle(bankName, brand, color);
            return (
              <div className={`${previewTheme.textColorClass} rounded-[16px] p-md aspect-[1.58] flex flex-col justify-between relative overflow-hidden shadow-xl transition-all duration-500`} style={previewTheme.bgStyle}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none"></div>
                
                <div className="flex justify-between items-start z-10">
                  <span className="text-headline-md font-headline-md font-black tracking-tight">{bankName || 'Banco'}</span>
                  <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${previewTheme.tagBg}`}>
                    {name || 'Apelido'}
                  </span>
                </div>

                <div className="z-10 mt-auto">
                  <div className="mb-xs opacity-80">
                    <span className="material-symbols-outlined text-[32px]">memory</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-body-md tracking-widest font-mono select-none">
                      •••• •••• •••• ••••
                    </div>
                    {previewTheme.fakeLogo}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Form Container */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          {error && (
            <div className="mb-4 bg-error-container text-on-error-container text-xs px-4 py-3 rounded-lg border border-error/10 flex items-center gap-xs">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={editingCard ? handleEditCard : handleAddCard} className="space-y-md">
            <div className="space-y-1">
              <label className="text-label-sm font-label-sm text-on-surface-variant block">Apelido do Cartão</label>
              <input
                type="text"
                required
                placeholder="Ex: Nubank Roxinho, Inter Platinum"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
              />
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant block">Banco</label>
                <CustomSelect
                  options={bankOptions}
                  value={bankName}
                  onChange={handleBankChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant block">Bandeira</label>
                <CustomSelect
                  options={brandOptions}
                  value={brand}
                  onChange={setBrand}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-label-sm font-label-sm text-on-surface-variant block">Cor do Cartão</label>
              <div className="flex items-center gap-sm">
                {/* Quadrado de Cor Premium que abre a paleta ao clicar */}
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-outline-variant shrink-0 shadow-sm transition-transform active:scale-95">
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#712ae2'}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    className="absolute inset-0 w-[200%] h-[200%] -translate-x-[25%] -translate-y-[25%] cursor-pointer border-0 p-0"
                  />
                </div>
                {/* Input de Texto para digitar ou colar o código HEX */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Ex: #8D0DE3"
                    value={color}
                    onChange={(e) => {
                      let val = e.target.value.toUpperCase();
                      val = val.replace(/[^#0-9A-F]/g, ''); // Permite apenas Hexadecimal
                      if (val && !val.startsWith('#')) {
                        val = '#' + val;
                      }
                      if (val.length <= 7) {
                        setColor(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface font-mono placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            {parentOptions.length > 0 && (
              <div className="flex items-center gap-sm bg-surface border border-outline-variant rounded-lg p-sm">
                <input
                  type="checkbox"
                  id="shareLimit"
                  checked={shareLimit}
                  onChange={(e) => {
                    setShareLimit(e.target.checked);
                    if (e.target.checked && parentOptions.length > 0 && !parentCardId) {
                      setParentCardId(parentOptions[0].value);
                      const p = cards.find(c => c.id === parentOptions[0].value);
                      if (p) setLimit(p.limit.toString());
                    }
                  }}
                  className="w-4 h-4 cursor-pointer"
                />
                <label htmlFor="shareLimit" className="text-label-md font-label-md text-on-surface cursor-pointer select-none">
                  Compartilhar limite com outro cartão
                </label>
              </div>
            )}

            {shareLimit && parentOptions.length > 0 && (
              <div className="space-y-1 animate-fade-in">
                <label className="text-label-sm font-label-sm text-on-surface-variant block">Cartão Principal</label>
                <CustomSelect
                  options={parentOptions}
                  value={parentCardId}
                  onChange={(val) => {
                    setParentCardId(val);
                    const p = cards.find(c => c.id === val);
                    if (p) setLimit(p.limit.toString());
                  }}
                />
              </div>
            )}

            {!shareLimit && (
              <div className="space-y-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant block">Limite Total (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium select-none text-body-md">R$</span>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={limitFormatted}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface border border-outline-variant rounded-lg text-body-md text-on-surface placeholder-on-surface-variant/40 outline-none transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-sm">
              {/* Dia de Fechamento */}
              <div className="space-y-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant block">Dia Fechamento</label>
                <div className="flex items-center bg-surface border border-outline-variant rounded-lg overflow-hidden h-[42px] focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all">
                  <button
                    type="button"
                    onClick={() => setClosingDay(prev => Math.max(1, parseInt(prev || '1') - 1).toString())}
                    className="h-full px-3 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center border-r border-outline-variant/30 select-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={closingDay}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        setClosingDay('');
                        return;
                      }
                      const val = parseInt(valStr);
                      if (!isNaN(val) && val >= 1 && val <= 31) {
                        setClosingDay(val.toString());
                      }
                    }}
                    className="w-full h-full text-center bg-transparent border-0 text-body-md text-on-surface outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setClosingDay(prev => Math.min(31, parseInt(prev || '1') + 1).toString())}
                    className="h-full px-3 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center border-l border-outline-variant/30 select-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>

              {/* Dia de Vencimento */}
              <div className="space-y-1">
                <label className="text-label-sm font-label-sm text-on-surface-variant block">Dia Vencimento</label>
                <div className="flex items-center bg-surface border border-outline-variant rounded-lg overflow-hidden h-[42px] focus-within:ring-2 focus-within:ring-secondary/20 focus-within:border-secondary transition-all">
                  <button
                    type="button"
                    onClick={() => setDueDay(prev => Math.max(1, parseInt(prev || '1') - 1).toString())}
                    className="h-full px-3 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center border-r border-outline-variant/30 select-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <input
                    type="number"
                    required
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => {
                      const valStr = e.target.value;
                      if (valStr === '') {
                        setDueDay('');
                        return;
                      }
                      const val = parseInt(valStr);
                      if (!isNaN(val) && val >= 1 && val <= 31) {
                        setDueDay(val.toString());
                      }
                    }}
                    className="w-full h-full text-center bg-transparent border-0 text-body-md text-on-surface outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setDueDay(prev => Math.min(31, parseInt(prev || '1') + 1).toString())}
                    className="h-full px-3 hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center border-l border-outline-variant/30 select-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-sm pt-sm">
              {editingCard && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-1/2 py-2 px-3 bg-surface-container-high hover:bg-surface-dim text-on-surface-variant rounded-lg text-label-md font-label-md transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`${editingCard ? 'w-1/2' : 'w-full'} py-2 px-3 bg-secondary text-on-secondary disabled:opacity-50 rounded-lg text-label-md font-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-xs cursor-pointer`}
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">{editingCard ? 'save' : 'add'}</span>
                    <span>{editingCard ? 'Salvar' : 'Cadastrar'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
