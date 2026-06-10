'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarProps {
  userName: string;
  userEmail: string;
}

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Resumo', href: '/dashboard', icon: 'dashboard' },
    { name: 'Cartões', href: '/cards', icon: 'credit_card' },
    { name: 'Transações', href: '/transactions', icon: 'receipt' },
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
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-surface border-r border-outline-variant/30 hidden lg:flex flex-col justify-between py-lg px-md z-50">
      <div>
        {/* Brand/Logo Header */}
        <div className="flex items-center gap-sm mb-xl px-sm">
          <span className="material-symbols-outlined text-headline-md text-primary font-bold">account_balance</span>
          <div>
            <h1 className="text-headline-md font-headline-md font-bold text-primary tracking-tight">MinhaFatura</h1>
            <p className="text-label-sm font-label-sm text-on-surface-variant">Seu melhor gestor de cartão.</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <ul className="flex flex-col gap-xs">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-md py-sm rounded-lg transition-all active:scale-[0.98] ${
                    active
                      ? 'text-secondary font-bold border-l-4 border-secondary bg-secondary/10 pl-[8px] pr-sm'
                      : 'text-on-surface-variant opacity-70 hover:bg-surface-container-high transition-colors px-sm'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {item.icon}
                  </span>
                  <span className="text-label-md font-label-md">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* User Actions & Session Info */}
      <div>
        <hr className="border-outline-variant/30 my-sm" />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-md px-sm py-sm rounded-lg text-on-surface-variant opacity-70 hover:bg-surface-container-high hover:text-red-600 transition-colors active:scale-[0.98] cursor-pointer"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-label-md font-label-md">Sair da Conta</span>
        </button>

        {/* Profile Details */}
        <Link 
          href="/profile" 
          className="mt-md px-sm py-xs flex items-center gap-sm hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer group border border-transparent hover:border-outline-variant/10"
          title="Ver perfil"
        >
          <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container border border-outline-variant/30 flex items-center justify-center font-bold text-sm select-none group-hover:ring-2 group-hover:ring-secondary/40 transition-all">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-md font-label-md text-on-surface truncate group-hover:text-secondary transition-colors font-semibold">{userName || 'Usuário'}</p>
            <p className="text-label-sm font-label-sm text-on-surface-variant truncate">{userEmail || 'email@email.com'}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
