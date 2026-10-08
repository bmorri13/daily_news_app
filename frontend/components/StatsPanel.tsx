'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronRight, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow, addHours, isFuture } from 'date-fns';
import { Stats, Source, getSources } from '@/lib/api';
import { getCategory } from '@/lib/categories';

interface StatsPanelProps {
  stats: Stats | null;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  useEffect(() => {
    const fetchSources = async () => {
      setSourcesLoading(true);
      try {
        setSources(await getSources());
      } catch (err) {
        console.error('Failed to fetch sources:', err);
      } finally {
        setSourcesLoading(false);
      }
    };
    fetchSources();
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (!stats) {
    return (
      <div className="rounded-xl border border-line p-5">
        <p className="text-sm text-fg-subtle">Feed stats aren&apos;t available right now.</p>
      </div>
    );
  }

  const lastFetchDate = stats.last_fetch?.started_at
    ? new Date(stats.last_fetch.started_at)
    : null;

  const nextSync = lastFetchDate ? addHours(lastFetchDate, stats.fetch_interval_hours) : null;
  const nextSyncLabel = nextSync
    ? isFuture(nextSync) ? `in ${formatDistanceToNow(nextSync)}` : 'soon'
    : null;

  const totalArticles = stats.total_articles;
  const status = stats.last_fetch?.status;

  return (
    <section aria-labelledby="stats-heading" className="rounded-xl border border-line">
      <div className="p-5">
        <h2 id="stats-heading" className="text-sm font-medium text-fg-muted mb-4">
          Feed stats
        </h2>

        {/* Totals */}
        <dl className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <dt className="text-xs text-fg-subtle">Articles</dt>
            <dd className="text-2xl font-semibold text-fg tabular-nums">{totalArticles.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-subtle">Active sources</dt>
            <dd className="text-2xl font-semibold text-fg tabular-nums">{stats.active_sources}</dd>
          </div>
        </dl>

        {/* Distribution */}
        <div className="flex h-2 gap-0.5 rounded-full overflow-hidden bg-surface-raised" aria-hidden>
          {stats.categories.map(category => {
            const count = stats.articles_by_category[category] || 0;
            const percentage = totalArticles > 0 ? (count / totalArticles) * 100 : 0;
            if (percentage === 0) return null;
            return (
              <div
                key={category}
                className="h-full transition-opacity duration-200"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: getCategory(category).color,
                  opacity: hoveredCategory && hoveredCategory !== category ? 0.3 : 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      <ul className="border-t border-line divide-y divide-[var(--border)]">
        {stats.categories.map(category => {
          const { label, shortLabel, color } = getCategory(category);
          const count = stats.articles_by_category[category] || 0;
          const percentage = totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0;
          const isExpanded = expandedCategories.has(category);
          const categorySources = sources.filter(s => s.category === category && s.active);
          const panelId = `sources-${category}`;

          return (
            <li key={category}>
              <button
                onClick={() => toggleCategory(category)}
                onMouseEnter={() => setHoveredCategory(category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onFocus={() => setHoveredCategory(category)}
                onBlur={() => setHoveredCategory(null)}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className="w-full flex items-center gap-2.5 px-5 py-3 text-left hover:bg-surface transition-colors duration-150"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
                <span className="flex-1 text-sm text-fg-muted" title={label}>{shortLabel}</span>
                <span className="text-sm font-medium text-fg tabular-nums">{count}</span>
                <span className="w-9 text-right text-xs text-fg-subtle tabular-nums">{percentage}%</span>
                <ChevronRight
                  size={14}
                  aria-hidden
                  className={`text-fg-subtle transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              {isExpanded && (
                <div id={panelId} className="px-5 pb-3 pl-[2.375rem]">
                  {sourcesLoading ? (
                    <p className="flex items-center gap-2 py-1 text-xs text-fg-subtle">
                      <Loader2 size={12} className="animate-spin" aria-hidden />
                      Loading sources…
                    </p>
                  ) : categorySources.length > 0 ? (
                    <ul className="space-y-0.5">
                      {categorySources.map(source => (
                        <li key={source.id}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center justify-between gap-2 py-1 text-xs text-fg-subtle hover:text-fg transition-colors duration-150"
                          >
                            <span className="truncate">{source.name}</span>
                            <ArrowUpRight size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-1 text-xs text-fg-subtle">No active sources</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Sync status */}
      <div className="px-5 py-4 border-t border-line text-sm">
        <p className="flex items-center gap-2 text-fg-muted">
          {status === 'completed' ? (
            <CheckCircle2 size={14} className="text-positive" aria-hidden />
          ) : status === 'failed' ? (
            <XCircle size={14} className="text-negative" aria-hidden />
          ) : status ? (
            <Loader2 size={14} className="text-fg-subtle animate-spin" aria-hidden />
          ) : null}
          {lastFetchDate
            ? status === 'failed'
              ? `Last sync failed ${formatDistanceToNow(lastFetchDate)} ago`
              : status === 'completed'
                ? `Synced ${formatDistanceToNow(lastFetchDate)} ago`
                : 'Syncing now…'
            : 'Not synced yet'}
        </p>
        {(nextSyncLabel || (stats.last_fetch?.articles_fetched ?? 0) > 0) && (
          <p className="mt-1 text-xs text-fg-subtle">
            {stats.last_fetch && stats.last_fetch.articles_fetched > 0 &&
              `${stats.last_fetch.articles_fetched} new articles`}
            {stats.last_fetch && stats.last_fetch.articles_fetched > 0 && nextSyncLabel && ' · '}
            {nextSyncLabel && `Next sync ${nextSyncLabel}`}
          </p>
        )}
      </div>
    </section>
  );
}
