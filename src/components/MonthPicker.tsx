'use client';

import React, { useState, useEffect, useRef } from 'react';

interface MonthPickerProps {
  value: string; // 'all', 'this-month', 'last-month', 'next-month', or 'MM-YYYY'
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'filter';
}

const monthsShort = [
  'Jan', 'Fev', 'Mar',
  'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set',
  'Out', 'Nov', 'Dez'
];

const getMonthName = (month: number) => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1];
};

export default function MonthPicker({
  value,
  onChange,
  disabled = false,
  className = '',
  variant = 'default',
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);

  // Temporary picker state
  const [tempYear, setTempYear] = useState(() => new Date().getFullYear());
  const [tempMonth, setTempMonth] = useState(() => new Date().getMonth() + 1); // 1-indexed

  // Parse value to temporary state when opening
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      if (value === 'all') {
        setTempYear(now.getFullYear());
        setTempMonth(now.getMonth() + 1);
      } else if (value === 'this-month') {
        setTempYear(now.getFullYear());
        setTempMonth(now.getMonth() + 1);
      } else if (value === 'last-month') {
        const d = new Date();
        d.setMonth(now.getMonth() - 1);
        setTempYear(d.getFullYear());
        setTempMonth(d.getMonth() + 1);
      } else if (value === 'next-month') {
        const d = new Date();
        d.setMonth(now.getMonth() + 1);
        setTempYear(d.getFullYear());
        setTempMonth(d.getMonth() + 1);
      } else {
        const [mStr, yStr] = value.split('-');
        const m = parseInt(mStr);
        const y = parseInt(yStr);
        if (!isNaN(m) && !isNaN(y)) {
          setTempYear(y);
          setTempMonth(m);
        }
      }
    }
  }, [isOpen, value]);

  // Dynamically position popover
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const estimatedHeight = 310; // Popover height
      const spaceAbove = rect.top;

      if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempYear(prev => prev - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempYear(prev => prev + 1);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formattedMonth = tempMonth.toString().padStart(2, '0');
    onChange(`${formattedMonth}-${tempYear}`);
    setIsOpen(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('all');
    setIsOpen(false);
  };

  const getDisplayLabel = () => {
    if (value === 'all') return 'Todo o Período';
    if (value === 'this-month') {
      const now = new Date();
      return variant === 'filter'
        ? `${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
        : `Este Mês (${getMonthName(now.getMonth() + 1)}/${now.getFullYear()})`;
    }
    if (value === 'last-month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return variant === 'filter'
        ? `${getMonthName(d.getMonth() + 1)} ${d.getFullYear()}`
        : `Mês Passado (${getMonthName(d.getMonth() + 1)}/${d.getFullYear()})`;
    }
    if (value === 'next-month') {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return variant === 'filter'
        ? `${getMonthName(d.getMonth() + 1)} ${d.getFullYear()}`
        : `Próximo Mês (${getMonthName(d.getMonth() + 1)}/${d.getFullYear()})`;
    }

    const [mStr, yStr] = value.split('-');
    const m = parseInt(mStr);
    const y = parseInt(yStr);
    if (isNaN(m) || isNaN(y)) return 'Selecione o período...';
    return variant === 'filter'
      ? `${getMonthName(m)} ${y}`
      : `${getMonthName(m)} de ${y}`;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-md py-sm rounded-lg text-body-md text-on-surface outline-none transition-all duration-200 select-none cursor-pointer ${
          variant === 'filter'
            ? 'bg-[#EFF1F4] border border-transparent font-medium font-semibold h-[42px]'
            : 'bg-surface-container-lowest border border-outline-variant'
        } ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-surface-container-low'
            : isOpen
              ? 'ring-2 ring-secondary/20 border-secondary shadow-[0_0_0_2px_rgba(113,42,226,0.15)]'
              : variant === 'filter'
                ? 'hover:bg-[#E5E8EC]'
                : 'hover:border-outline hover:bg-surface-container-low/30'
        }`}
      >
        <div className="flex items-center gap-sm truncate">
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 font-bold">
            calendar_month
          </span>
          <span className="truncate font-medium">{getDisplayLabel()}</span>
        </div>
        <span className={`material-symbols-outlined text-on-surface-variant shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-secondary' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={`absolute right-0 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden w-[290px] flex flex-col backdrop-blur-md animate-fade-in ${
            direction === 'up' ? 'bottom-full mb-xs' : 'top-full mt-xs'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-sm border-b border-outline-variant/20">
            <button
              type="button"
              onClick={handlePrevYear}
              className="p-xs hover:bg-surface-container-low rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="text-body-md font-bold text-on-surface select-none">{tempYear}</span>
            <button
              type="button"
              onClick={handleNextYear}
              className="p-xs hover:bg-surface-container-low rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-sm p-md bg-surface-container-lowest">
            {monthsShort.map((monthLabel, index) => {
              const monthNum = index + 1;
              const isSelected = tempMonth === monthNum;
              return (
                <button
                  key={monthLabel}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTempMonth(monthNum);
                  }}
                  className={`py-sm rounded-xl text-label-md font-semibold text-center select-none cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-secondary text-on-secondary font-bold shadow-[0_2px_8px_rgba(113,42,226,0.25)]'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/70'
                  }`}
                >
                  {monthLabel}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-md py-sm border-t border-outline-variant/20 bg-surface-container-low/40 rounded-b-xl gap-sm">
            <button
              type="button"
              onClick={handleClear}
              className="text-secondary hover:underline font-bold text-xs cursor-pointer text-left truncate shrink-0"
              title="Limpar filtro para todo o período"
            >
              Todo o Período
            </button>
            <div className="flex gap-xs shrink-0">
              <button
                type="button"
                onClick={handleCancel}
                className="px-sm py-base hover:bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface-variant cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-md py-base bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
