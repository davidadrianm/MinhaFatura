'use client';

import React from 'react';

export default function DebtorsSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-md mb-md">
        <div className="h-8 w-32 bg-surface-container-highest rounded" />
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-wrap sm:flex-nowrap gap-md items-end shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full mb-md">
        {/* Pesquisar */}
        <div className="flex-1 min-w-[200px]">
          <div className="h-4 w-20 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Mês */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <div className="h-4 w-12 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Novo Devedor Button */}
        <div className="shrink-0">
          <div className="h-[42px] w-36 bg-surface-container-high rounded-lg" />
        </div>
      </div>

      {/* Debtors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="border border-outline-variant/30 bg-surface-container-lowest rounded-xl p-md flex flex-col justify-between min-h-[180px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-sm">
                {/* Avatar simulation */}
                <div className="w-10 h-10 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant font-bold text-sm" />
                <div className="space-y-xs">
                  <div className="h-5 w-24 bg-surface-container-highest rounded" />
                  <div className="h-3 w-16 bg-surface-container rounded" />
                </div>
              </div>
              <div className="flex gap-xs">
                <div className="w-8 h-8 bg-surface-container rounded-lg" />
                <div className="w-8 h-8 bg-surface-container rounded-lg" />
              </div>
            </div>

            <div className="mt-4 space-y-sm">
              <div className="flex justify-between items-end">
                <div className="space-y-xs">
                  <div className="h-3 w-16 bg-surface-container-high rounded" />
                  <div className="h-6 w-24 bg-surface-container-highest rounded" />
                </div>
                <div className="space-y-xs text-right">
                  <div className="h-3 w-16 bg-surface-container-high rounded ml-auto" />
                  <div className="h-5 w-20 bg-surface-container-highest rounded ml-auto" />
                </div>
              </div>
              
              <div className="w-full bg-surface-container-high h-[6px] rounded-full mt-2" />
            </div>

            <div className="mt-4 pt-sm border-t border-outline-variant/10 flex justify-between items-center">
              <div className="h-5 w-24 bg-surface-container rounded" />
              <div className="h-6 w-16 bg-surface-container-high rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
