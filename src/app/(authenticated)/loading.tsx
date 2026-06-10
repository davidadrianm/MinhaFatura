export default function AuthenticatedLoading() {
  return (
    <div className="space-y-lg">
      {/* Header Skeleton */}
      <div className="space-y-xs animate-pulse">
        <div className="h-8 w-48 bg-surface-container-highest rounded-md" />
        <div className="h-4 w-80 bg-surface-container-high rounded-md" />
      </div>

      {/* Grid of Bento Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-lg">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 h-32 flex flex-col justify-between animate-pulse"
          >
            <div className="flex justify-between items-start">
              <div className="h-4 w-32 bg-surface-container-high rounded" />
              <div className="h-6 w-6 bg-surface-container-high rounded-full" />
            </div>
            <div>
              <div className="h-8 w-40 bg-surface-container-highest rounded" />
              <div className="h-2 w-full bg-surface-container rounded mt-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton (Bento Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mt-lg">
        {/* Large List Area (e.g. Transactions / Monthly Evolution) */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 h-[450px] flex flex-col justify-between animate-pulse">
          <div className="flex justify-between items-center mb-md">
            <div className="h-6 w-36 bg-surface-container-highest rounded" />
            <div className="h-4 w-20 bg-surface-container-high rounded" />
          </div>
          
          <div className="flex-1 flex flex-col justify-between py-md">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex justify-between items-center py-sm border-b border-outline-variant/10 last:border-0">
                <div className="flex items-center gap-md w-full max-w-[70%]">
                  <div className="w-10 h-10 bg-surface-container-high rounded-full shrink-0" />
                  <div className="space-y-xs w-full">
                    <div className="h-4 w-1/2 bg-surface-container-highest rounded" />
                    <div className="h-3 w-1/3 bg-surface-container rounded" />
                  </div>
                </div>
                <div className="h-5 w-24 bg-surface-container-highest rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Small List / Donut Chart Area */}
        <div className="bg-surface-container-lowest rounded-xl p-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-outline-variant/20 h-[450px] flex flex-col justify-between animate-pulse">
          <div className="h-6 w-40 bg-surface-container-highest rounded mb-md" />
          
          <div className="flex-1 flex flex-col items-center justify-center py-md">
            {/* Skeleton Donut */}
            <div className="w-40 h-40 rounded-full border-12 border-surface-container flex items-center justify-center">
              <div className="w-24 h-24 bg-surface-container-lowest rounded-full" />
            </div>
          </div>

          <div className="space-y-sm mt-md">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex justify-between items-center">
                <div className="flex items-center gap-xs">
                  <div className="w-3 h-3 bg-surface-container-high rounded-full" />
                  <div className="h-4 w-20 bg-surface-container rounded" />
                </div>
                <div className="h-4 w-8 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
