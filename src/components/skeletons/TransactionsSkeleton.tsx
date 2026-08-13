'use client';

import React from 'react';

export default function TransactionsSkeleton() {
  return (
    <div className="space-y-md animate-pulse">
      {/* Top header row */}
      <div className="flex items-center justify-between gap-md mb-md">
        <div className="h-8 w-40 bg-surface-container-highest rounded" />
      </div>

      {/* Filters Bar Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-md flex flex-wrap lg:flex-nowrap gap-md items-end shadow-[0_4px_20px_rgba(0,0,0,0.03)] w-full mb-md">
        {/* Pesquisar */}
        <div className="flex-1 min-w-[180px]">
          <div className="h-4 w-20 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Cartão */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <div className="h-4 w-16 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Categoria */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <div className="h-4 w-20 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Mês */}
        <div className="flex-1 min-w-[150px] lg:max-w-[200px]">
          <div className="h-4 w-12 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
        {/* Status */}
        <div className="flex-1 min-w-[200px] lg:max-w-[260px]">
          <div className="h-4 w-16 bg-surface-container-high rounded mb-xs" />
          <div className="h-[42px] bg-surface-container-low rounded-lg w-full" />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 overflow-hidden">
        <div className="w-full">
          {/* Header Row */}
          <div className="border-b border-surface-container-high bg-surface-container-low h-12 flex items-center px-md gap-md">
            <div className="w-20 bg-surface-container-high h-4 rounded" />
            <div className="flex-1 bg-surface-container-high h-4 rounded" />
            <div className="w-24 bg-surface-container-high h-4 rounded" />
            <div className="w-24 bg-surface-container-high h-4 rounded" />
            <div className="w-28 bg-surface-container-high h-4 rounded" />
            <div className="w-20 bg-surface-container-high h-4 rounded" />
            <div className="w-16 bg-surface-container-high h-4 rounded" />
            <div className="w-24 bg-surface-container-high h-4 rounded" />
            <div className="w-16 bg-surface-container-high h-4 rounded" />
          </div>
          {/* Table Body rows */}
          <div className="divide-y divide-surface-container-high">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 flex items-center px-md gap-md">
                {/* Date */}
                <div className="w-20 bg-surface-container h-4 rounded" />
                {/* Description */}
                <div className="flex-1 bg-surface-container-highest h-4 rounded w-1/3" />
                {/* Category */}
                <div className="w-24 bg-surface-container h-6 rounded-md" />
                {/* Card */}
                <div className="w-24 bg-surface-container h-6 rounded-md" />
                {/* Type */}
                <div className="w-28 bg-surface-container h-6 rounded-md" />
                {/* Value */}
                <div className="w-20 bg-surface-container-highest h-4 rounded" />
                {/* Status */}
                <div className="w-16 bg-surface-container h-5 rounded-full" />
                {/* Shared */}
                <div className="w-24 bg-surface-container h-4 rounded" />
                {/* Actions */}
                <div className="w-16 bg-surface-container h-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
