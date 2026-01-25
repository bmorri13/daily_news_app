'use client';

export function ArticleCardSkeleton() {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 relative overflow-hidden rounded-lg">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] skeleton" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-4 w-20" />
          </div>
          <div className="skeleton h-5 w-full mb-2" />
          <div className="skeleton h-5 w-3/4" />
        </div>
        <div className="skeleton w-8 h-8" />
      </div>

      {/* Summary */}
      <div className="space-y-2 mb-5">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex gap-2">
          <div className="skeleton h-5 w-14" />
          <div className="skeleton h-5 w-14" />
          <div className="skeleton h-5 w-14" />
        </div>
        <div className="skeleton h-5 w-20" />
      </div>
    </div>
  );
}

export function CategorySectionSkeleton() {
  return (
    <section className="mb-16">
      {/* Section Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="skeleton w-10 h-10" />
          <div className="skeleton h-px flex-1" />
          <div className="skeleton h-4 w-16" />
        </div>

        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="skeleton h-10 w-48 mb-2" />
            <div className="skeleton h-4 w-64" />
          </div>
          <div className="skeleton h-9 w-28 hidden md:block" />
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <ArticleCardSkeleton key={i} />
        ))}
      </div>

      {/* Section divider */}
      <div className="mt-12 section-divider" />
    </section>
  );
}

export function DigestSkeleton() {
  return (
    <div>
      {/* Hero Header Skeleton */}
      <div className="mb-12 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton w-1 h-12" />
          <div>
            <div className="skeleton h-3 w-20 mb-2" />
            <div className="skeleton h-12 w-48" />
          </div>
        </div>
        <div className="flex items-center gap-6 ml-4">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-px flex-1" />
          <div className="skeleton h-4 w-40" />
        </div>
      </div>

      {/* Category Sections */}
      {[1, 2, 3, 4].map((i) => (
        <CategorySectionSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatsPanelSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-5 rounded-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="skeleton w-8 h-8" />
          <div>
            <div className="skeleton h-4 w-20 mb-1" />
            <div className="skeleton h-3 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-4 rounded-md">
            <div className="skeleton h-3 w-16 mb-2" />
            <div className="skeleton h-10 w-12" />
          </div>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-4 rounded-md">
            <div className="skeleton h-3 w-16 mb-2" />
            <div className="skeleton h-10 w-8" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-5 rounded-lg">
        <div className="skeleton h-3 w-20 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-4 w-8" />
              </div>
              <div className="skeleton h-[3px] w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-5 rounded-lg">
        <div className="skeleton h-3 w-24 mb-4" />
        <div className="skeleton h-4 w-32" />
      </div>
    </div>
  );
}
