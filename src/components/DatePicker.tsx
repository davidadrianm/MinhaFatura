'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
  value: string; // Format: 'YYYY-MM-DD'
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const monthsFull = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const monthsShort = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function DatePicker({
  value,
  onChange,
  disabled = false,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [viewMode, setViewMode] = useState<'calendar' | 'month-year'>('calendar');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value to internal viewing state
  const [tempYear, setTempYear] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) return parseInt(parts[0]);
    }
    return new Date().getFullYear();
  });

  const [tempMonth, setTempMonth] = useState(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) return parseInt(parts[1]) - 1; // 0-indexed internally
    }
    return new Date().getMonth();
  });

  // Sync temp year/month when value changes or popup opens
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setTempYear(parseInt(parts[0]));
        setTempMonth(parseInt(parts[1]) - 1);
      }
    }
  }, [value, isOpen]);

  // Dynamically position popover (upwards if hitting bottom limit)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const estimatedHeight = 350; // Popover estimated height
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
        setViewMode('calendar');
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
      setViewMode('calendar');
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tempMonth === 0) {
      setTempMonth(11);
      setTempYear(prev => prev - 1);
    } else {
      setTempMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tempMonth === 11) {
      setTempMonth(0);
      setTempYear(prev => prev + 1);
    } else {
      setTempMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number, month: number, year: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onChange(`${year}-${formattedMonth}-${formattedDay}`);
    setIsOpen(false);
  };

  const handleGoToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setTempYear(y);
    setTempMonth(m);
    handleSelectDay(d, m, y);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Get display value in DD/MM/YYYY format
  const getDisplayValue = () => {
    if (!value) return 'Selecione uma data...';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Build Calendar Days
  const getCalendarDays = () => {
    const days = [];
    const firstDayIndex = new Date(tempYear, tempMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(tempYear, tempMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(tempYear, tempMonth, 0).getDate();

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = tempMonth === 0 ? 11 : tempMonth - 1;
      const prevY = tempMonth === 0 ? tempYear - 1 : tempYear;
      days.push({
        day,
        month: prevM,
        year: prevY,
        isCurrentMonth: false,
        key: `prev-${day}`,
      });
    }

    // Current month days
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    const [selY, selM, selD] = value ? value.split('-').map(Number) : [0, 0, 0];

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = tempYear === todayY && tempMonth === todayM && day === todayD;
      const isSelected = selY === tempYear && (selM - 1) === tempMonth && selD === day;
      days.push({
        day,
        month: tempMonth,
        year: tempYear,
        isCurrentMonth: true,
        isToday,
        isSelected,
        key: `curr-${day}`,
      });
    }

    // Next month padding days to fill 42 cells (6 rows * 7 columns)
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const nextM = tempMonth === 11 ? 0 : tempMonth + 1;
      const nextY = tempMonth === 11 ? tempYear + 1 : tempYear;
      days.push({
        day,
        month: nextM,
        year: nextY,
        isCurrentMonth: false,
        key: `next-${day}`,
      });
    }

    return days;
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Date Trigger Input/Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-md py-sm rounded-lg text-body-md text-on-surface outline-none transition-all duration-200 select-none cursor-pointer bg-surface border border-outline-variant ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-surface-container-low'
            : isOpen
              ? 'ring-2 ring-secondary/20 border-secondary shadow-[0_0_0_2px_rgba(113,42,226,0.15)]'
              : 'hover:border-outline hover:bg-surface-container-low/30'
        }`}
      >
        <div className="flex items-center gap-sm truncate">
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 font-bold">
            calendar_month
          </span>
          <span className={`truncate ${!value ? 'text-on-surface-variant/40' : 'font-medium'}`}>
            {getDisplayValue()}
          </span>
        </div>
        <span className={`material-symbols-outlined text-on-surface-variant shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-secondary' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Calendar Overlay */}
      {isOpen && (
        <div
          className={`absolute right-0 left-0 md:left-auto md:w-[310px] bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden flex flex-col backdrop-blur-md animate-fade-in ${
            direction === 'up' ? 'bottom-full mb-xs' : 'top-full mt-xs'
          }`}
        >
          {viewMode === 'calendar' ? (
            <>
              {/* Header Navigation */}
              <div className="flex items-center justify-between px-sm py-xs border-b border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setViewMode('month-year')}
                  className="flex items-center gap-2xs px-sm py-xs hover:bg-surface-container-low rounded-lg text-body-sm font-bold text-on-surface hover:text-secondary transition-colors cursor-pointer select-none"
                >
                  <span>{monthsFull[tempMonth]} de {tempYear}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                </button>
                <div className="flex gap-4xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-xs hover:bg-surface-container-low rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-xs hover:bg-surface-container-low rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-4xs px-md pt-sm text-center">
                {daysOfWeek.map((day, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-bold text-on-surface-variant/70 uppercase select-none h-6 flex items-center justify-center"
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Day Grid */}
              <div className="grid grid-cols-7 gap-y-xs gap-x-4xs p-md">
                {getCalendarDays().map((cell) => {
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => handleSelectDay(cell.day, cell.month, cell.year)}
                      className={`h-8 w-8 mx-auto rounded-lg text-body-sm select-none cursor-pointer flex items-center justify-center transition-all duration-150 relative ${
                        cell.isSelected
                          ? 'bg-secondary text-on-secondary font-bold shadow-[0_2px_8px_rgba(113,42,226,0.25)]'
                          : cell.isCurrentMonth
                            ? 'text-on-surface hover:bg-surface-container-high'
                            : 'text-on-surface-variant/35 hover:bg-surface-container-low/40'
                      } ${
                        cell.isToday && !cell.isSelected
                          ? 'border border-secondary/60 text-secondary font-bold'
                          : ''
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between px-md py-sm border-t border-outline-variant/20 bg-surface-container-low/40 rounded-b-xl gap-sm">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-on-surface-variant hover:text-error hover:underline font-semibold text-xs cursor-pointer select-none"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="px-md py-base bg-secondary text-on-secondary rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm select-none"
                >
                  Hoje
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Quick Month-Year Selection */}
              <div className="flex items-center justify-between p-sm border-b border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setTempYear(prev => prev - 1)}
                  className="p-xs hover:bg-surface-container-low rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-body-md font-bold text-on-surface select-none">{tempYear}</span>
                <button
                  type="button"
                  onClick={() => setTempYear(prev => prev + 1)}
                  className="p-xs hover:bg-surface-container-low rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              {/* Month Selector Grid */}
              <div className="grid grid-cols-3 gap-sm p-md bg-surface-container-lowest">
                {monthsShort.map((monthLabel, index) => {
                  const isSelected = tempMonth === index;
                  return (
                    <button
                      key={monthLabel}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempMonth(index);
                        setViewMode('calendar');
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

              {/* Back to Calendar view button */}
              <div className="flex items-center justify-end px-md py-sm border-t border-outline-variant/20 bg-surface-container-low/40 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className="px-md py-base hover:bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface-variant cursor-pointer transition-colors"
                >
                  Voltar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
