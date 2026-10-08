'use client';

// Skeletons mirror the real layout so content doesn't jump when it loads.

function StorySkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={featured ? '' : 'py-5 first:pt-0 last:pb-0'}>
      <div className="skeleton h-3 w-32 mb-3" />
      {featured ? (
        <>
          <div className="skeleton h-8 w-full mb-2" />
          <div className="skeleton h-8 w-2/3 mb-5" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
          </div>
        </>
      ) : (
        <>
          <div className="skeleton h-5 w-full mb-1.5" />
          <div className="skeleton h-5 w-3/4" />
        </>
      )}
    </div>
  );
}

export function CategorySectionSkeleton() {
  return (
    <section className="mb-16" aria-hidden>
      <div className="flex items-baseline gap-4 pb-3 mb-6 border-b border-line">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-64 hidden sm:block" />
      </div>
      <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <StorySkeleton featured />
        <div className="divide-y divide-[var(--border)] pt-8 border-t border-line lg:pt-0 lg:border-t-0 lg:pl-12 lg:border-l">
          {[1, 2, 3].map(i => <StorySkeleton key={i} />)}
        </div>
      </div>
    </section>
  );
}

export function DigestSkeleton() {
  return (
    <div role="status" aria-label="Loading digest">
      <div className="pt-10 pb-12">
        <div className="skeleton h-4 w-40 mb-3" />
        <div className="skeleton h-12 w-64" />
      </div>
      {[1, 2, 3].map(i => (
        <CategorySectionSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsPanelSkeleton() {
  return (
    <div className="rounded-xl border border-line" role="status" aria-label="Loading feed stats">
      <div className="p-5">
        <div className="skeleton h-4 w-20 mb-4" />
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div className="skeleton h-3 w-14 mb-2" />
            <div className="skeleton h-8 w-16" />
          </div>
          <div>
            <div className="skeleton h-3 w-20 mb-2" />
            <div className="skeleton h-8 w-10" />
          </div>
        </div>
        <div className="skeleton h-2 w-full rounded-full" />
      </div>
      <div className="border-t border-line divide-y divide-[var(--border)]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-line">
        <div className="skeleton h-4 w-36" />
      </div>
    </div>
  );
}

export function NewsletterSkeleton() {
  return (
    <div role="status" aria-label="Loading newsletter">
      <div className="pt-10 pb-12">
        <div className="skeleton h-4 w-36 mb-3" />
        <div className="skeleton h-12 w-40 mb-4" />
        <div className="skeleton h-4 w-56" />
      </div>
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="pt-5 border-t border-line">
            <div className="skeleton h-5 w-32 mb-4" />
            <div className="space-y-2.5">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
