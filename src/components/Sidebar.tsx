'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
}

export default function Sidebar({ userName, userEmail, userAvatar }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Resumo', href: '/dashboard', icon: 'dashboard' },
    { name: 'Cartões', href: '/cards', icon: 'credit_card' },
    { name: 'Transações', href: '/transactions', icon: 'payments' },
    { name: 'Faturas', href: '/invoices', icon: 'calendar_month' },
    { name: 'Categorias', href: '/categories', icon: 'category' },
    { name: 'Gastos Compartilhados', href: '/debtors', icon: 'group' },
  ];

  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) {
      router.push('/');
      router.refresh();
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
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
    <aside className="fixed left-0 top-0 h-screen w-[280px] hidden lg:flex flex-col justify-between py-lg px-md z-50">
      {/* Painel de vidro flutuante */}
      <div className="absolute inset-3 right-0 rounded-[28px] glass shadow-card" aria-hidden="true" />

      <div className="relative px-xs pt-xs">
        {/* Brand/Logo Header */}
        <div className="flex items-center gap-sm mb-xl px-sm">
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient shadow-glow flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined icon-fill text-[24px]">credit_card_heart</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-headline-sm font-extrabold tracking-tight text-on-surface leading-tight">
              Minha<span className="text-brand-gradient">Fatura</span>
            </h1>
            <p className="text-[11px] font-medium text-on-surface-variant truncate">Seu melhor gestor de cartão.</p>
          </div>
        </div>

        <p className="px-sm mb-xs text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/70">Menu</p>

        {/* Navigation Menu */}
        <ul className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center gap-sm px-sm py-[10px] rounded-xl transition-all duration-200 active:scale-[0.98] ${active
                    ? 'nav-active font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-secondary/8 hover:translate-x-0.5'
                    }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${active ? '' : 'group-hover:scale-110 group-hover:text-secondary'}`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="text-label-md font-label-md">{item.name}</span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Actions & Session Info */}
      <div className="relative px-xs pb-xs">
        {/* Profile Details */}
        <Link
          href="/profile"
          className="p-sm flex items-center gap-sm rounded-2xl bg-surface-container-low/70 border border-outline-variant/30 hover:border-secondary/40 hover:bg-secondary/5 transition-all cursor-pointer group"
          title="Ver perfil"
        >
          <div className="relative w-10 h-10 rounded-full p-[2px] bg-brand-gradient shrink-0">
            <div className="w-full h-full rounded-full bg-surface-container-lowest text-secondary flex items-center justify-center font-bold text-sm select-none overflow-hidden">
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
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-surface-container-lowest" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md text-on-surface truncate group-hover:text-secondary transition-colors font-semibold">{userName || 'Usuário'}</p>
            <p className="text-[11px] text-on-surface-variant truncate">{userEmail || 'email@email.com'}</p>
          </div>
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-secondary group-hover:translate-x-0.5 transition-all">chevron_right</span>
        </Link>

        <button
          onClick={handleLogout}
          className="mt-xs w-full flex items-center gap-sm px-sm py-[10px] rounded-xl text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors active:scale-[0.98] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span className="text-label-md font-label-md">Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}
