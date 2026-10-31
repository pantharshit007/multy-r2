function Bar({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-md bg-raised ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-line-strong/40 to-transparent" />
    </div>
  );
}

export function FileSkeleton() {
  const rows = Array.from({ length: 4 });
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading files">
      {rows.map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_5.5rem_10.5rem_6.5rem]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Bar className="size-8 shrink-0 rounded-lg" />
            <Bar className="h-3.5 w-1/2" />
          </div>
          <Bar className="hidden h-3 w-12 justify-self-end md:block" />
          <Bar className="hidden h-3 w-28 md:block" />
          <div className="flex justify-end gap-1">
            <Bar className="size-7 rounded-lg" />
            <Bar className="size-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
