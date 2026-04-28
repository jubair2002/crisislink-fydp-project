/**
 * Tiny shimmering skeleton primitive used by all admin loading states.
 * Tailwind's `animate-pulse` is the cheapest way to communicate "loading"
 * without adding a 3rd-party shimmer dep.
 */
export const Skel = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-surface-border/60 ${className}`} />
);

export const PageSkeleton = () => (
  <div className="space-y-6">
    <header className="space-y-2">
      <Skel className="h-7 w-64" />
      <Skel className="h-4 w-96" />
    </header>

    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-surface border border-surface-border shadow-card p-5 flex items-start gap-4"
        >
          <Skel className="w-11 h-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skel className="h-3 w-24" />
            <Skel className="h-6 w-20" />
            <Skel className="h-3 w-32" />
          </div>
        </div>
      ))}
    </section>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 lg:col-span-2 h-80">
        <Skel className="h-4 w-40 mb-4" />
        <Skel className="h-full w-full" />
      </div>
      <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 h-80">
        <Skel className="h-4 w-40 mb-4" />
        <Skel className="h-full w-full" />
      </div>
      <div className="rounded-xl bg-surface border border-surface-border shadow-card p-5 h-80">
        <Skel className="h-4 w-40 mb-4" />
        <Skel className="h-full w-full" />
      </div>
    </div>
  </div>
);
