'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const leftItems = [
  { href: '/dashboard', icon: 'home', label: 'Resumo' },
  { href: '/cards', icon: 'credit_card', label: 'Cartões' },
];

const rightItems = [
  { href: '/debtors', icon: 'group', label: 'Gastos' },
  { href: '/categories', icon: 'category', label: 'Categorias' },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  const renderItem = (item: { href: string; icon: string; label: string }) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`relative flex flex-col items-center justify-center w-16 py-1.5 rounded-2xl active:scale-90 transition-all ${
          active ? 'text-secondary' : 'text-on-surface-variant'
        }`}
      >
        <span
          className={`flex items-center justify-center w-11 h-7 rounded-full transition-all duration-300 ${
            active ? 'bg-secondary/15' : ''
          }`}
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {item.icon}
          </span>
        </span>
        <span className={`text-[10px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-3 inset-x-3 z-50 lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="glass shadow-card rounded-[26px] flex justify-around items-center px-2 py-1.5">
        {leftItems.map(renderItem)}

        {/* Add FAB */}
        <Link
          href="/transactions?new=true"
          aria-label="Nova transação"
          className="btn-brand -mt-8 w-14 h-14 rounded-2xl flex items-center justify-center rotate-0 active:scale-90 ring-4 ring-background"
        >
          <span className="material-symbols-outlined text-[30px]">add</span>
        </Link>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
