'use client';

import { useEffect, useCallback } from 'react';
import {
  X,
  ExternalLink,
  Clock,
  TrendingUp,
  Sparkles,
  Target,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Article, getCategoryColor } from '@/lib/api';

interface ArticleModalProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ArticleModal({ article, isOpen, onClose }: ArticleModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || !article) return null;

  const categoryColor = getCategoryColor(article.category);

  const formattedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : 'Unknown date';

  const fullDate = article.published_at
    ? format(new Date(article.published_at), 'MMMM d, yyyy • h:mm a')
    : null;

  const relevancePercent = article.relevance_score
    ? Math.round(article.relevance_score * 100)
    : null;

  // Parse the summary into executive summary with bullet points
  const generateExecutiveSummary = (summary: string | null, title: string) => {
    if (!summary) return null;

    // Split summary into sentences (keeping sentences intact)
    const sentences = summary
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    // Generate bullet points - each sentence becomes a key point
    const bulletPoints: string[] = [];

    sentences.forEach((sentence) => {
      if (bulletPoints.length >= 5) return;

      // Clean up the sentence
      let point = sentence.trim();

      // Remove trailing period for cleaner bullet points
      if (point.endsWith('.')) {
        point = point.slice(0, -1);
      }

      // Only add substantial points
      if (point.length > 20) {
        bulletPoints.push(point);
      }
    });

    // If we have fewer than 3 points, try to extract more from longer sentences
    if (bulletPoints.length < 3 && bulletPoints.length > 0) {
      const expandedPoints: string[] = [];

      bulletPoints.forEach(point => {
        // Look for natural breaking points like semicolons or "and" with independent clauses
        const semicolonSplit = point.split(/;\s*/);
        if (semicolonSplit.length > 1 && semicolonSplit.every(p => p.length > 25)) {
          semicolonSplit.forEach(p => {
            if (expandedPoints.length < 5) {
              expandedPoints.push(p.trim());
            }
          });
        } else {
          expandedPoints.push(point);
        }
      });

      // If still not enough, try splitting on " - " or long comma phrases
      if (expandedPoints.length < 3) {
        const finalPoints: string[] = [];
        expandedPoints.forEach(point => {
          const dashSplit = point.split(/\s+[-–—]\s+/);
          if (dashSplit.length > 1 && dashSplit.every(p => p.length > 20)) {
            dashSplit.forEach(p => {
              if (finalPoints.length < 5) finalPoints.push(p.trim());
            });
          } else {
            finalPoints.push(point);
          }
        });
        return { summary, bulletPoints: finalPoints.slice(0, 5) };
      }

      return { summary, bulletPoints: expandedPoints.slice(0, 5) };
    }

    return {
      summary: summary,
      bulletPoints: bulletPoints.slice(0, 5)
    };
  };

  const executiveSummary = generateExecutiveSummary(article.summary, article.title);

  const getSentimentInfo = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive':
        return { label: 'Positive Outlook', color: 'var(--cyber-primary)', bg: 'var(--cyber-glow)' };
      case 'negative':
        return { label: 'Negative Outlook', color: '#ff4757', bg: 'rgba(255, 71, 87, 0.15)' };
      default:
        return { label: 'Neutral', color: 'var(--text-secondary)', bg: 'rgba(161, 161, 170, 0.1)' };
    }
  };

  const sentimentInfo = getSentimentInfo(article.sentiment);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl animate-fade-in-up rounded-lg"
        style={{ animationDuration: '0.3s' }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ background: categoryColor }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-hover)] transition-all rounded-md"
        >
          <X size={18} className="text-[var(--text-secondary)]" />
        </button>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-6 pr-12">
            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
              {article.source_name && (
                <span
                  className="category-badge"
                  style={{
                    ['--category-color' as string]: categoryColor,
                    ['--category-glow' as string]: `${categoryColor}20`,
                  }}
                >
                  {article.source_name}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Clock size={12} />
                {formattedDate}
              </span>
            </div>

            {/* Title */}
            <h2 className="font-display text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight mb-3">
              {article.title}
            </h2>

            {fullDate && (
              <p className="text-sm text-[var(--text-muted)]">
                Published {fullDate}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="section-divider mb-6" />

          {/* Executive Summary Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} style={{ color: categoryColor }} />
              <span className="font-display text-xs tracking-[0.15em] text-[var(--text-muted)] uppercase">
                Executive Summary
              </span>
            </div>

            {executiveSummary ? (
              <div className="space-y-5">
                {/* Summary Overview */}
                <div className="bg-[var(--bg-primary)] border-l-2 p-4" style={{ borderColor: categoryColor }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={14} style={{ color: categoryColor }} />
                    <span className="font-display text-[10px] tracking-[0.1em] uppercase" style={{ color: categoryColor }}>
                      Overview
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)] leading-relaxed">
                    {executiveSummary.summary}
                  </p>
                </div>

                {/* Key Points */}
                {executiveSummary.bulletPoints.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb size={14} style={{ color: categoryColor }} />
                      <span className="font-display text-[10px] tracking-[0.1em] uppercase" style={{ color: categoryColor }}>
                        Key Points
                      </span>
                    </div>
                    <ul className="space-y-3">
                      {executiveSummary.bulletPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-display font-bold mt-0.5"
                            style={{
                              backgroundColor: `${categoryColor}20`,
                              color: categoryColor,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-[var(--text-secondary)] leading-relaxed">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[var(--text-muted)] italic">
                No summary available for this article.
              </p>
            )}
          </div>

          {/* Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-[var(--bg-primary)] border border-[var(--border-subtle)] mb-6">
            {/* Sentiment */}
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                Sentiment:
              </span>
              <span
                className="text-xs font-semibold px-2 py-1"
                style={{ color: sentimentInfo.color, background: sentimentInfo.bg }}
              >
                {sentimentInfo.label}
              </span>
            </div>

            {/* Relevance */}
            {relevancePercent !== null && (
              <div className="flex items-center gap-2">
                <span className="font-display text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                  Relevance:
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <TrendingUp size={14} style={{ color: categoryColor }} />
                  <span className="font-display font-bold" style={{ color: categoryColor }}>
                    {relevancePercent}%
                  </span>
                </span>
              </div>
            )}

            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] tracking-wider text-[var(--text-muted)] uppercase">
                Category:
              </span>
              <span className="text-xs font-semibold capitalize" style={{ color: categoryColor }}>
                {article.category}
              </span>
            </div>
          </div>

          {/* Tags */}
          {article.ai_tags && article.ai_tags.length > 0 && (
            <div className="mb-6">
              <span className="font-display text-[10px] tracking-[0.1em] text-[var(--text-muted)] uppercase block mb-3">
                Topics
              </span>
              <div className="flex flex-wrap gap-2">
                {article.ai_tags.map((tag, idx) => (
                  <span key={idx} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 font-display text-sm font-medium transition-all duration-200 rounded-md hover:shadow-lg"
            style={{
              background: categoryColor,
              color: 'var(--bg-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 20px ${categoryColor}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span>Read Full Article</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
