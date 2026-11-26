'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Saudação conforme o horário local do navegador (calculada só no cliente para evitar mismatch de hidratação).
function useGreeting() {
  const [greeting, setGreeting] = useState('Olá');
  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      setGreeting(h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}

interface TopNavBarProps {
  userName: string;
  userAvatar?: string | null;
}

export default function TopNavBar({ userName, userAvatar }: TopNavBarProps) {
  const pathname = usePathname();
  const greeting = useGreeting();

  // Determinar o título com base na rota
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) {
      const firstName = userName.split(' ')[0];
      return `${greeting}, ${firstName}`;
    }
    if (pathname.startsWith('/cards')) {
      return 'Gestão de Cartões';
    }
    if (pathname.startsWith('/transactions')) {
      return 'Transações';
    }
    if (pathname.startsWith('/invoices')) {
      return 'Faturas de Cartões';
    }
    if (pathname.startsWith('/categories')) {
      return 'Categorias de Gastos';
    }
    if (pathname.startsWith('/debtors')) {
      return 'Gastos Compartilhados';
    }
    return 'Gestão Financeira';
  };

  const getPageSubtitle = () => {
    if (pathname.startsWith('/dashboard')) {
      return 'Aqui está o resumo da sua vida financeira hoje.';
    }
    if (pathname.startsWith('/cards')) {
      return 'Gerencie limites, faturas e detalhes dos seus cartões físicos e virtuais.';
    }
    if (pathname.startsWith('/transactions')) {
      return 'Gerencie e acompanhe todos os seus gastos e recebimentos.';
    }
    if (pathname.startsWith('/invoices')) {
      return 'Acompanhe o fechamento, datas de vencimento e parcelas ativas.';
    }
    if (pathname.startsWith('/categories')) {
      return 'Organize seus gastos classificando-os em categorias personalizadas.';
    }
    if (pathname.startsWith('/debtors')) {
      return 'Controle de Recebíveis e reembolsos de despesas divididas.';
    }
    return 'Seu melhor gestor de cartão.';
  };

  const userInitials = userName
    ? userName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'US';

  const isDashboard = pathname.startsWith('/dashboard');

  return (
    <header className="sticky top-0 z-40 w-full px-grid-margin pt-md pb-sm">
      <div className="glass shadow-card rounded-2xl lg:rounded-[22px] flex justify-between items-center gap-md px-md py-sm">
        {/* Mobile Title */}
        <div className="flex items-center gap-sm lg:hidden min-w-0">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined icon-fill text-[20px]">credit_card_heart</span>
          </div>
          <h2 className="text-headline-sm font-extrabold tracking-tight text-on-surface truncate">
            Minha<span className="text-brand-gradient">Fatura</span>
          </h2>
        </div>

        {/* Desktop Title & Subtitle */}
        <div className="hidden lg:block min-w-0">
          <h2 className="text-headline-md font-extrabold tracking-tight text-on-surface truncate">
            {isDashboard ? (
              <>
                {getPageTitle().split(',')[0]},{' '}
                <span className="text-brand-gradient">{getPageTitle().split(',').slice(1).join(',').trim()}</span>
                <span className="inline-block ml-2 origin-[70%_70%] animate-[wave_2.4s_ease-in-out_1]">👋</span>
              </>
            ) : (
              getPageTitle()
            )}
          </h2>
          <p className="text-body-sm text-on-surface-variant truncate">{getPageSubtitle()}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-xs sm:gap-sm shrink-0">
          <button
            className="relative w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
            title="Notificações"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-brand-gradient ring-2 ring-surface-container-lowest" />
          </button>
          <button
            className="hidden sm:flex w-10 h-10 items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-xl transition-all cursor-pointer"
            title="Ajuda"
          >
            <span className="material-symbols-outlined text-[22px]">help_outline</span>
          </button>

          {/* Link standardizing query trigger for add transaction modal */}
          <Link
            href="/transactions?new=true"
            className="btn-brand hidden sm:flex px-md py-[10px] rounded-xl text-label-md font-semibold active:scale-95 items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nova Transação</span>
          </Link>

          {/* Avatar */}
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full p-[2px] bg-brand-gradient hover:shadow-glow transition-all cursor-pointer shrink-0"
            title="Ver perfil"
          >
            <span className="w-full h-full rounded-full bg-surface-container-lowest text-secondary flex items-center justify-center font-bold text-sm select-none overflow-hidden">
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                userInitials
              )}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
