'use client';

import { Inbox, Clock } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 animate-fade-in">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center rounded-lg">
          <Inbox size={32} className="text-[var(--text-muted)]" />
        </div>
        {/* Corner accent */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--accent-primary)] rounded-sm" />
      </div>

      {/* Text */}
      <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
        No Articles Yet
      </h2>

      <p className="text-[var(--text-secondary)] text-center max-w-md mb-6 text-sm leading-relaxed">
        Your news digest is empty. Articles will appear here once the scheduler
        fetches and processes the latest news from your configured RSS sources.
      </p>

      {/* Status hint */}
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Clock size={14} />
        <p className="text-xs">
          Check the Feed Stats panel for sync status
        </p>
      </div>

      {/* Decorative grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(var(--border-subtle) 1px, transparent 1px),
              linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
    </div>
  );
}
