'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 bg-surface border-t border-outline-variant/20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 lg:hidden">
      {/* Home / Dashboard */}
      <Link 
        href="/dashboard" 
        className={`flex flex-col items-center justify-center rounded-lg p-1 active:scale-90 transition-all ${
          isActive('/dashboard') 
            ? 'text-secondary font-bold' 
            : 'text-on-surface-variant opacity-70'
        }`}
      >
        <span className="material-symbols-outlined" style={isActive('/dashboard') ? { fontVariationSettings: "'FILL' 1" } : undefined}>home</span>
        <span className="text-[10px] mt-1">Home</span>
      </Link>

      {/* Cartões */}
      <Link 
        href="/cards" 
        className={`flex flex-col items-center justify-center rounded-lg p-1 active:scale-90 transition-all ${
          isActive('/cards') 
            ? 'text-secondary font-bold' 
            : 'text-on-surface-variant opacity-70'
        }`}
      >
        <span className="material-symbols-outlined" style={isActive('/cards') ? { fontVariationSettings: "'FILL' 1" } : undefined}>credit_card</span>
        <span className="text-[10px] mt-1">Cartões</span>
      </Link>

      {/* Add FAB */}
      <Link 
        href="/transactions?new=true" 
        className="flex flex-col items-center justify-center text-on-secondary hover:bg-secondary-container rounded-lg p-1 active:scale-90 transition-all -mt-6"
      >
        <div className="bg-secondary text-on-primary rounded-full p-2.5 shadow-lg">
          <span className="material-symbols-outlined text-[28px]">add</span>
        </div>
      </Link>

      {/* Gastos Compartilhados (Devedores) */}
      <Link 
        href="/debtors" 
        className={`flex flex-col items-center justify-center rounded-lg p-1 active:scale-90 transition-all ${
          isActive('/debtors') 
            ? 'text-secondary font-bold' 
            : 'text-on-surface-variant opacity-70'
        }`}
      >
        <span className="material-symbols-outlined" style={isActive('/debtors') ? { fontVariationSettings: "'FILL' 1" } : undefined}>group</span>
        <span className="text-[10px] mt-1">Gastos</span>
      </Link>

      {/* Categorias / Mais */}
      <Link 
        href="/categories" 
        className={`flex flex-col items-center justify-center rounded-lg p-1 active:scale-90 transition-all ${
          isActive('/categories') 
            ? 'text-secondary font-bold' 
            : 'text-on-surface-variant opacity-70'
        }`}
      >
        <span className="material-symbols-outlined" style={isActive('/categories') ? { fontVariationSettings: "'FILL' 1" } : undefined}>category</span>
        <span className="text-[10px] mt-1">Categorias</span>
      </Link>
    </nav>
  );
}
