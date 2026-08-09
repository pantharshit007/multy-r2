export function FileSkeleton() {
  const rows = Array.from({ length: 4 });
  return (
    <div className="divide-y divide-zinc-800/60">
      {rows.map((_, index) => (
        <div
          key={index}
          className="grid gap-2 px-4 py-4 md:grid-cols-[minmax(0,1fr)_4.5rem_9.5rem_6.75rem] md:items-center"
        >
          {/* Key name skeleton */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
            </div>
            <div className="relative h-4 w-2/3 overflow-hidden rounded bg-zinc-900">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
            </div>
          </div>

          {/* Size skeleton */}
          <div className="relative h-3 w-12 overflow-hidden rounded bg-zinc-900 md:block">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
          </div>

          {/* Uploaded date skeleton */}
          <div className="relative h-3 w-28 overflow-hidden rounded bg-zinc-900 md:block">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
          </div>

          {/* Actions button skeleton */}
          <div className="flex items-center justify-end gap-1.5">
            <div className="relative size-8 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
            </div>
            <div className="relative size-8 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
            </div>
            <div className="relative size-8 overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
