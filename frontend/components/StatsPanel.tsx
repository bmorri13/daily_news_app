'use client';

import { useState } from 'react';
import {
  Zap,
  FileText,
  Rss,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow, addHours, isFuture } from 'date-fns';
import { Stats, getCategoryColor, getCategoryLabel } from '@/lib/api';

interface StatsPanelProps {
  stats: Stats | null;
  loading?: boolean;
}

export default function StatsPanel({ stats, loading }: StatsPanelProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-6 rounded-lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-6 rounded-lg">
        <p className="text-center text-[var(--text-muted)] py-8 text-sm">
          Unable to load statistics
        </p>
      </div>
    );
  }

  const lastFetchDate = stats.last_fetch?.started_at
    ? new Date(stats.last_fetch.started_at)
    : null;

  const lastFetchTime = lastFetchDate
    ? formatDistanceToNow(lastFetchDate, { addSuffix: false }) + ' ago'
    : 'Never';

  const nextSyncTime = lastFetchDate
    ? (() => {
        const nextSync = addHours(lastFetchDate, stats.fetch_interval_hours);
        if (isFuture(nextSync)) {
          return 'in ' + formatDistanceToNow(nextSync, { addSuffix: false });
        }
        return 'soon';
      })()
    : null;

  const totalArticles = stats.total_articles;
  const maxCategoryCount = Math.max(...Object.values(stats.articles_by_category));

  return (
    <div className="relative">
      {/* Main Stats Card */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden rounded-lg">
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[var(--accent-primary)]" />
              <span className="font-display text-sm text-[var(--text-secondary)]">
                Feed Stats
              </span>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
              </span>
              <span className="font-display text-xs text-[var(--accent-primary)]">Live</span>
            </div>
          </div>
        </div>

        {/* Big Stats Row */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between gap-4">
            {/* Articles */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={12} className="text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">Articles</span>
              </div>
              <div className="font-display text-4xl font-bold text-[var(--text-primary)]">
                {totalArticles}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-12 bg-[var(--border-subtle)]" />

            {/* Sources */}
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                <span className="text-xs text-[var(--text-muted)]">Sources</span>
                <Rss size={12} className="text-[var(--text-muted)]" />
              </div>
              <div className="font-display text-4xl font-bold text-[var(--text-primary)]">
                {stats.active_sources}
              </div>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={12} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Distribution</span>
          </div>

          {/* Visual Bar Distribution - with segment dividers for data clarity */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--bg-tertiary)] relative">
            {stats.categories.map((category, index) => {
              const count = stats.articles_by_category[category] || 0;
              const percentage = totalArticles > 0 ? (count / totalArticles) * 100 : 0;
              const color = getCategoryColor(category);
              const isLast = index === stats.categories.length - 1;

              return (
                <div
                  key={category}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full relative"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    opacity: hoveredCategory && hoveredCategory !== category ? 0.3 : 1,
                  }}
                  onMouseEnter={() => setHoveredCategory(category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {/* Segment divider */}
                  {!isLast && percentage > 0 && (
                    <div
                      className="absolute right-0 top-0 w-[1px] h-full bg-[var(--bg-primary)]"
                      style={{ opacity: 0.6 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category List */}
        <div className="border-t border-[var(--border-subtle)]">
          {stats.categories.map((category, index) => {
            const count = stats.articles_by_category[category] || 0;
            const percentage = totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0;
            const color = getCategoryColor(category);
            const isHovered = hoveredCategory === category;

            return (
              <div
                key={category}
                className={`
                  relative px-5 py-3 cursor-pointer transition-all duration-200
                  ${index !== stats.categories.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}
                  hover:bg-[var(--surface-hover)]
                `}
                onMouseEnter={() => setHoveredCategory(category)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: color,
                        boxShadow: isHovered ? `0 0 8px ${color}` : 'none',
                      }}
                    />
                    <span
                      className="text-sm transition-colors duration-200"
                      style={{ color: isHovered ? color : 'var(--text-secondary)' }}
                    >
                      {getCategoryLabel(category)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="font-display text-sm font-medium tabular-nums"
                      style={{ color: isHovered ? color : 'var(--text-primary)' }}
                    >
                      {count}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] w-8 text-right">
                      {percentage}%
                    </span>
                    <ChevronRight
                      size={14}
                      className="transition-all duration-200"
                      style={{
                        color: isHovered ? color : 'var(--text-muted)',
                        transform: isHovered ? 'translateX(2px)' : 'translateX(0)',
                        opacity: isHovered ? 1 : 0.5,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sync Status Footer */}
        <div className="px-5 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  Last sync: {lastFetchTime}
                </span>
              </div>
              {nextSyncTime && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--text-muted)] opacity-0" />
                  <span className="text-xs text-[var(--text-muted)]">
                    Next sync: {nextSyncTime}
                  </span>
                </div>
              )}
            </div>

            {stats.last_fetch && (
              <div className="flex items-center gap-1.5">
                {stats.last_fetch.status === 'completed' ? (
                  <CheckCircle size={14} className="text-[var(--accent-primary)]" />
                ) : stats.last_fetch.status === 'failed' ? (
                  <XCircle size={14} className="text-red-400" />
                ) : (
                  <Loader2 size={14} className="text-[var(--accent-primary)] animate-spin" />
                )}
                <span className={`font-display text-xs font-medium ${
                  stats.last_fetch.status === 'completed'
                    ? 'text-[var(--accent-primary)]'
                    : stats.last_fetch.status === 'failed'
                      ? 'text-red-400'
                      : 'text-[var(--accent-primary)]'
                }`}>
                  {stats.last_fetch.status === 'completed' ? 'Synced' : stats.last_fetch.status}
                </span>
              </div>
            )}
          </div>

          {stats.last_fetch && stats.last_fetch.articles_fetched > 0 && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">
                +{stats.last_fetch.articles_fetched} new articles added
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
