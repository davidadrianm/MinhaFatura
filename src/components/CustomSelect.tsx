'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  color?: string; // Hex color for a category color dot
  icon?: string;  // Material symbols icon name
  badge?: string; // Text to render in a small badge next to label (e.g. Card type)
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'filter';
  hideSelectedIcon?: boolean;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  disabled = false,
  className = '',
  variant = 'default',
  hideSelectedIcon = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find((opt) => opt.value === value);

  // Dynamically position dropdown (upwards if hitting bottom limit)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      
      // Estimate height: ~38px per option + padding (8px)
      const estimatedHeight = Math.min(options.length * 38 + 8, 300);
      const spaceAbove = rect.top;
      
      if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
        setDirection('up');
      } else {
        setDirection('down');
      }
    }
  }, [isOpen, options.length]);

  // Close dropdown on click outside
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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
    
    if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Select Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full h-full flex items-center justify-between px-md py-sm rounded-lg text-body-md text-on-surface outline-none transition-all duration-200 select-none cursor-pointer ${
          variant === 'filter'
            ? 'bg-[#EFF1F4] border border-transparent font-medium h-[42px]'
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
          {selectedOption ? (
            <>
              {/* Category Color Dot */}
              {selectedOption.color && !hideSelectedIcon && (
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner" 
                  style={{ backgroundColor: selectedOption.color }} 
                />
              )}
              {/* Option Icon */}
              {selectedOption.icon && !hideSelectedIcon && (
                <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                  {selectedOption.icon}
                </span>
              )}
              <span className="truncate">{selectedOption.label}</span>
              {/* Optional Badge */}
              {selectedOption.badge && (
                <span className="text-[9px] font-bold bg-surface-container-high px-1.5 py-[2px] rounded uppercase text-on-surface-variant shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-on-surface-variant/40">{placeholder}</span>
          )}
        </div>
        
        {/* Toggle Arrow */}
        <span className={`material-symbols-outlined text-on-surface-variant shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-secondary' : ''}`}>
          expand_more
        </span>
      </button>

      {/* Options Dropdown Menu */}
      {isOpen && (
        <div className={`absolute left-0 right-0 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden backdrop-blur-md animate-fade-in py-xs ${
          direction === 'up' ? 'bottom-full mb-xs' : 'top-full mt-xs'
        }`}>
          {options.length === 0 ? (
            <div className="px-md py-sm text-xs text-on-surface-variant/50 text-center select-none">
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between px-md py-sm text-left text-body-md text-on-surface transition-all duration-150 cursor-pointer select-none ${
                    isSelected 
                      ? 'bg-secondary/10 text-secondary font-bold' 
                      : 'hover:bg-surface-container-high/65 active:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-sm truncate">
                    {/* Category Color Dot */}
                    {option.color && (
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-inner" 
                        style={{ backgroundColor: option.color }} 
                      />
                    )}
                    {/* Option Icon */}
                    {option.icon && (
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${isSelected ? 'text-secondary font-bold' : 'text-on-surface-variant/75'}`}>
                        {option.icon}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                    {/* Optional Badge */}
                    {option.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-[2px] rounded uppercase shrink-0 ${isSelected ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                        {option.badge}
                      </span>
                    )}
                  </div>
                  
                  {/* Selected checkmark */}
                  {isSelected && (
                    <span className="material-symbols-outlined text-secondary text-lg shrink-0 font-bold">
                      check
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
