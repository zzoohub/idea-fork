export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      {/* Breadcrumbs skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-4 w-4 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>

      {/* Header skeleton */}
      <div className="space-y-6 mb-10">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-border-dark">
          <div className="flex items-start gap-6">
            <div className="skeleton size-24 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-8 w-48 rounded" />
              <div className="skeleton h-4 w-full max-w-md rounded" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200 dark:border-border-dark"
            >
              <div className="skeleton h-4 w-24 rounded mb-3" />
              <div className="skeleton h-8 w-20 rounded mb-2" />
              <div className="skeleton h-3 w-32 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div className="skeleton h-6 w-40 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-24 rounded-lg" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-200 dark:border-border-dark"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="skeleton size-8 rounded-full" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
            <div className="skeleton h-5 w-3/4 rounded mb-2" />
            <div className="skeleton h-4 w-full rounded mb-1" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
