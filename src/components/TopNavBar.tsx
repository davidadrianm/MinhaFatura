'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface TopNavBarProps {
  userName: string;
  userAvatar?: string | null;
}

export default function TopNavBar({ userName, userAvatar }: TopNavBarProps) {
  const pathname = usePathname();

  // Determinar o título com base na rota
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) {
      const firstName = userName.split(' ')[0];
      return `Bom dia, ${firstName}`;
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

  return (
    <header className="flex justify-between items-center w-full px-grid-margin py-md bg-surface-container-low border-b border-outline-variant/20 z-40 sticky top-0">
      {/* Mobile Title */}
      <div className="flex items-center gap-sm lg:hidden">
        <span className="material-symbols-outlined text-headline-md font-black text-primary">account_balance</span>
        <h2 className="text-headline-md font-headline-md font-black text-primary">MinhaFatura</h2>
      </div>

      {/* Desktop Title & Subtitle */}
      <div className="hidden lg:block">
        <h2 className="text-headline-md font-headline-md font-bold text-on-surface">{getPageTitle()}</h2>
        <p className="text-body-md font-body-md text-on-surface-variant">{getPageSubtitle()}</p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-md">
        <button
          className="p-xs text-on-surface-variant hover:bg-surface-container-highest rounded-full hover:opacity-80 transition-all cursor-pointer"
          title="Notificações"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          className="p-xs text-on-surface-variant hover:bg-surface-container-highest rounded-full hover:opacity-80 transition-all cursor-pointer"
          title="Ajuda"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>

        {/* Link standardizing query trigger for add transaction modal */}
        <Link
          href="/transactions?new=true"
          className="bg-secondary text-on-primary px-sm py-xs lg:px-md lg:py-sm rounded-lg text-label-md font-label-md shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-xs"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span className="hidden sm:inline">Nova Transação</span>
        </Link>

        {/* Avatar */}
        <Link
          href="/profile"
          className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container border border-outline-variant/30 flex items-center justify-center font-bold text-sm select-none hover:ring-2 hover:ring-secondary/50 transition-all cursor-pointer overflow-hidden"
          title="Ver perfil"
        >
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
        </Link>
      </div>
    </header>
  );
}
