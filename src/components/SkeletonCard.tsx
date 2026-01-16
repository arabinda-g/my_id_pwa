export function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
          <div className="h-6 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-full bg-slate-800" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-56 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}
