'use client';

import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      {/* Financial Summary Bento Grid & Card Invoices Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Column: 2x2 Grid of Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-md">
          
          {/* Card 1: Fatura Atual */}
          <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 flex flex-col justify-between h-[136px]">
            <div className="flex justify-between items-start">
              <div className="h-4 w-32 bg-surface-container-high rounded" />
              <div className="w-5 h-5 bg-surface-container-high rounded-full" />
            </div>
            <div>
              <div className="h-8 w-44 bg-surface-container-highest rounded mb-2" />
              <div className="flex justify-between mt-1">
                <div className="h-3 w-20 bg-surface-container-high rounded" />
                <div className="h-3 w-24 bg-surface-container-high rounded" />
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2" />
            </div>
          </div>

          {/* Card 2: Limite Disponível */}
          <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 flex flex-col justify-between h-[136px]">
            <div className="flex justify-between items-start">
              <div className="h-4 w-36 bg-surface-container-high rounded" />
              <div className="w-5 h-5 bg-surface-container-high rounded-full" />
            </div>
            <div>
              <div className="h-8 w-40 bg-surface-container-highest rounded mb-2" />
              <div className="flex justify-between mt-1">
                <div className="h-3 w-28 bg-surface-container-high rounded" />
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2" />
            </div>
          </div>

          {/* Card 3: Devedores a Receber */}
          <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 flex flex-col justify-between h-[136px]">
            <div className="flex justify-between items-start">
              <div className="h-4 w-36 bg-surface-container-high rounded" />
              <div className="w-5 h-5 bg-surface-container-high rounded-full" />
            </div>
            <div>
              <div className="h-8 w-36 bg-surface-container-highest rounded mb-2" />
              <div className="h-3 w-48 bg-surface-container-high rounded mt-1" />
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2" />
            </div>
          </div>

          {/* Card 4: Limite Utilizado */}
          <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 flex flex-col justify-between h-[136px]">
            <div className="flex justify-between items-start">
              <div className="h-4 w-36 bg-surface-container-high rounded" />
              <div className="w-5 h-5 bg-surface-container-high rounded-full" />
            </div>
            <div>
              <div className="h-8 w-32 bg-surface-container-highest rounded mb-2" />
              <div className="h-3 w-40 bg-surface-container-high rounded mt-1" />
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2" />
            </div>
          </div>

        </div>

        {/* Right Column: Faturas a Vencer Alert Box */}
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 h-[288px] flex flex-col justify-between">
          <div>
            <div className="h-5 w-40 bg-surface-container-highest rounded mb-md" />
            <div className="space-y-sm">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center py-xs border-b border-outline-variant/10 last:border-0">
                  <div className="space-y-xs">
                    <div className="h-4 w-28 bg-surface-container-highest rounded" />
                    <div className="h-3 w-20 bg-surface-container rounded" />
                  </div>
                  <div className="h-5 w-16 bg-surface-container-high rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bento Grid: Evolution, Recent Transactions, Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Column: Chart & Recent Transactions */}
        <div className="lg:col-span-2 space-y-lg">
          
          {/* Chart Card */}
          <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 h-[300px] flex flex-col justify-between">
            <div className="h-5 w-44 bg-surface-container-highest rounded mb-md" />
            <div className="flex-1 flex items-end justify-between gap-sm px-sm pt-md">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-xs">
                  <div className="w-full bg-surface-container-high rounded-t" style={{ height: `${i * 30}px` }} />
                  <div className="h-3 w-8 bg-surface-container rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions Card */}
          <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 h-[380px] flex flex-col justify-between">
            <div className="flex justify-between items-center mb-md">
              <div className="h-5 w-44 bg-surface-container-highest rounded" />
              <div className="h-4 w-16 bg-surface-container-high rounded" />
            </div>
            <div className="flex-1 flex flex-col justify-between py-xs">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-outline-variant/10 last:border-0">
                  <div className="flex items-center gap-md w-3/4">
                    <div className="w-9 h-9 bg-surface-container-high rounded-full shrink-0" />
                    <div className="space-y-xs w-full">
                      <div className="h-4 w-1/3 bg-surface-container-highest rounded" />
                      <div className="h-3 w-1/4 bg-surface-container rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-surface-container-highest rounded" />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Donut & Category Distribution */}
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/20 h-[708px] flex flex-col justify-between">
          <div>
            <div className="h-5 w-48 bg-surface-container-highest rounded mb-md" />
            <div className="flex flex-col items-center justify-center py-lg mt-md">
              {/* Donut Simulation */}
              <div className="w-36 h-36 rounded-full border-12 border-surface-container-high flex items-center justify-center">
                <div className="w-24 h-24 bg-surface-container-lowest rounded-full" />
              </div>
            </div>
          </div>
          
          <div className="space-y-md mb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-xs">
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-xs">
                    <div className="w-3 h-3 rounded-full bg-surface-container-high" />
                    <div className="h-4 w-24 bg-surface-container-highest rounded" />
                  </div>
                  <div className="h-4 w-12 bg-surface-container-highest rounded" />
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
