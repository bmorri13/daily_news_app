'use client';

import { useEffect, useRef, KeyboardEvent } from 'react';
import { X, ArrowUpRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Article } from '@/lib/api';
import { getCategory } from '@/lib/categories';

interface ArticleModalProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
}

const SENTIMENT = {
  positive: { label: 'Positive', color: 'var(--positive)', Icon: ArrowUp },
  negative: { label: 'Negative', color: 'var(--negative)', Icon: ArrowDown },
  neutral: { label: 'Neutral', color: 'var(--fg-subtle)', Icon: Minus },
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ArticleModal({ article, isOpen, onClose }: ArticleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Lock scroll, move focus in, and restore focus to the opener on close
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      opener?.focus();
    };
  }, [isOpen]);

  if (!isOpen || !article) return null;

  const category = getCategory(article.category);
  const sentiment = SENTIMENT[article.sentiment ?? 'neutral'];

  const publishedAt = article.published_at ? new Date(article.published_at) : null;
  const relevancePercent = article.relevance_score
    ? Math.round(article.relevance_score * 100)
    : null;
  const keyPoints = article.key_points || [];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    // Keep focus inside the dialog
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-modal-title"
        tabIndex={-1}
        className="relative outline-none w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-surface border border-line rounded-t-xl sm:rounded-xl shadow-2xl shadow-black/50 animate-pop-in"
      >
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-md text-fg-subtle hover:text-fg hover:bg-surface-raised transition-colors duration-150"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <header className="mb-8 pr-10">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-subtle mb-3">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: category.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
                {category.shortLabel}
              </span>
              {article.source_name && (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-fg-muted">{article.source_name}</span>
                </>
              )}
              {publishedAt && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={article.published_at ?? undefined} title={format(publishedAt, 'MMMM d, yyyy, h:mm a')}>
                    {formatDistanceToNow(publishedAt, { addSuffix: true })}
                  </time>
                </>
              )}
            </p>

            <h2
              id="article-modal-title"
              className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-fg text-pretty"
            >
              {article.title}
            </h2>
          </header>

          {/* Summary */}
          <section className="mb-8">
            <h3 className="text-sm font-medium text-fg-subtle mb-2">Summary</h3>
            {article.summary ? (
              <p className="text-base text-fg leading-relaxed">{article.summary}</p>
            ) : (
              <p className="text-fg-subtle">No summary is available for this article.</p>
            )}
          </section>

          {/* Key points */}
          {keyPoints.length > 0 && (
            <section className="mb-8">
              <h3 className="text-sm font-medium text-fg-subtle mb-3">Key points</h3>
              <ol className="space-y-3">
                {keyPoints.map((point, idx) => (
                  <li key={idx} className="flex gap-4 text-fg-muted leading-relaxed">
                    <span className="flex-shrink-0 w-5 text-right text-sm font-medium text-fg-subtle tabular-nums pt-0.5">
                      {idx + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Details */}
          <dl className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-10 gap-y-4 py-5 mb-6 border-y border-line">
            <div>
              <dt className="text-xs text-fg-subtle mb-1">Sentiment</dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium" style={{ color: sentiment.color }}>
                <sentiment.Icon size={14} aria-hidden />
                {sentiment.label}
              </dd>
            </div>
            {relevancePercent !== null && (
              <div>
                <dt className="text-xs text-fg-subtle mb-1">Relevance</dt>
                <dd className="text-sm font-medium text-fg tabular-nums">{relevancePercent}%</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-fg-subtle mb-1">Category</dt>
              <dd className="text-sm font-medium text-fg">{category.label}</dd>
            </div>
          </dl>

          {/* Topics */}
          {article.ai_tags && article.ai_tags.length > 0 && (
            <section className="mb-8">
              <h3 className="sr-only">Topics</h3>
              <ul className="flex flex-wrap gap-2">
                {article.ai_tags.map((tag, idx) => (
                  <li key={idx} className="tag">{tag}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Primary action */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-accent text-accent-fg text-sm font-semibold hover:brightness-110 transition-[filter] duration-150"
          >
            Read the full article{article.source_name ? ` on ${article.source_name}` : ''}
            <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
