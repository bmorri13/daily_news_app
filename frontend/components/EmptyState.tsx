'use client';

export default function EmptyState() {
  return (
    <div className="py-24 max-w-md">
      <h2 className="font-serif text-2xl font-medium tracking-tight text-fg mb-3">
        No stories for this day yet
      </h2>
      <p className="text-fg-muted">
        The digest is put together once the daily sync finishes. Check back a little later,
        or pick an earlier day from the date menu.
      </p>
    </div>
  );
}
