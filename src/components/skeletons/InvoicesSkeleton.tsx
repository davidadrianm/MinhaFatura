'use client';

import React from 'react';

export default function InvoicesSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-md mb-md">
        <div className="h-8 w-32 bg-surface-container-highest rounded" />
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-wrap lg:flex-nowrap gap-md items-end shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full mb-md">
        {/* Cartão */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <div className="h-4 w-16 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Mês */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <div className="h-4 w-12 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Status */}
        <div className="flex-grow min-w-[280px]">
          <div className="h-4 w-16 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Exportar */}
        <div className="ml-auto shrink-0">
          <div className="h-[42px] w-28 bg-surface-container-low rounded-lg" />
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-sm">
        {[1, 2].map((i) => (
          <div 
            key={i} 
            className="border border-outline-variant/30 bg-surface-container-lowest rounded-xl overflow-hidden p-md flex flex-wrap md:flex-nowrap justify-between items-center gap-md"
          >
            <div className="flex items-center gap-md min-w-0">
              {/* Bank badge simulation */}
              <div className="w-12 h-12 rounded-full bg-surface-container-high shrink-0" />
              <div className="space-y-xs min-w-0">
                <div className="flex items-center gap-xs">
                  <div className="h-5 w-40 bg-surface-container-highest rounded" />
                  <div className="h-4 w-16 bg-surface-container-high rounded" />
                </div>
                <div className="flex items-center gap-sm">
                  <div className="h-3 w-32 bg-surface-container rounded" />
                  <div className="h-3 w-32 bg-surface-container rounded" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-md shrink-0">
              <div className="text-right space-y-xs">
                <div className="h-3 w-16 bg-surface-container-high rounded ml-auto" />
                <div className="h-7 w-28 bg-surface-container-highest rounded ml-auto" />
              </div>
              <div className="flex items-center gap-sm">
                <div className="h-6 w-16 bg-surface-container-high rounded-full" />
                <div className="w-6 h-6 bg-surface-container rounded" />
                <div className="w-24 h-8 bg-surface-container-highest rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
