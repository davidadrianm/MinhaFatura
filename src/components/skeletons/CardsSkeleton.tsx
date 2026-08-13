'use client';

import React from 'react';

export default function CardsSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-md mb-md">
        <div className="h-8 w-40 bg-surface-container-highest rounded" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Column: Grid of cards */}
        <div className="lg:col-span-2 space-y-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-md"
              >
                {/* Physical Card Simulation */}
                <div className="bg-surface-container-high rounded-[16px] p-md aspect-[1.58] flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="h-6 w-24 bg-surface-container-highest rounded" />
                    <div className="h-5 w-16 bg-surface-container-highest rounded-full" />
                  </div>
                  <div>
                    <div className="h-6 w-8 bg-surface-container-highest rounded mb-2" />
                    <div className="h-4 w-36 bg-surface-container-highest rounded font-mono" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-col gap-xs px-xs">
                  <div className="flex justify-between items-end mb-1">
                    <div className="space-y-xs">
                      <div className="h-3 w-20 bg-surface-container-high rounded" />
                      <div className="h-4 w-24 bg-surface-container-highest rounded" />
                    </div>
                    <div className="space-y-xs text-right">
                      <div className="h-3 w-16 bg-surface-container-high rounded" />
                      <div className="h-4 w-20 bg-surface-container-highest rounded" />
                    </div>
                  </div>
                  <div className="w-full h-[6px] bg-surface-container-high rounded-full" />
                  <div className="flex justify-between mt-1">
                    <div className="h-3.5 w-16 bg-surface-container rounded" />
                    <div className="h-3.5 w-24 bg-surface-container rounded" />
                  </div>
                </div>

                <hr className="border-outline-variant/30 border-t mx-xs" />

                {/* Fechamento e Vencimento */}
                <div className="flex justify-between items-center px-xs pb-xs">
                  <div className="h-8 w-20 bg-surface-container rounded" />
                  <div className="h-8 w-20 bg-surface-container rounded" />
                  <div className="flex gap-xs">
                    <div className="w-8 h-8 bg-surface-container rounded-lg" />
                    <div className="w-8 h-8 bg-surface-container rounded-lg" />
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Form preview skeleton */}
        <div className="space-y-md">
          <div className="h-6 w-48 bg-surface-container-highest rounded" />
          
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-md">
            <div className="h-4 w-32 bg-surface-container-high rounded mx-auto" />
            <div className="bg-surface-container rounded-[16px] aspect-[1.58] w-full" />
            
            {/* Form Fields skeletons */}
            <div className="space-y-sm">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-xs">
                  <div className="h-3 w-16 bg-surface-container rounded" />
                  <div className="h-10 bg-surface-container-low rounded-lg w-full" />
                </div>
              ))}
              <div className="h-12 bg-surface-container-high rounded-lg w-full mt-4" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
