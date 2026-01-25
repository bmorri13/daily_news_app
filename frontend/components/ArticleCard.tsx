'use client';

import { ArrowUpRight, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Article, getCategoryColor, getSentimentEmoji } from '@/lib/api';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  index?: number;
  onClick?: () => void;
}

export default function ArticleCard({ article, featured = false, index = 0, onClick }: ArticleCardProps) {
  const categoryColor = getCategoryColor(article.category);

  const formattedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : 'Unknown date';

  const relevancePercent = article.relevance_score
    ? Math.round(article.relevance_score * 100)
    : null;

  return (
    <div
      onClick={onClick}
      className={`
        group block relative overflow-hidden cursor-pointer
        rounded-lg transition-all duration-300 ease-out
        hover:border-[var(--accent-primary)]
        animate-fade-in-up
        ${featured
          ? 'md:col-span-2 md:row-span-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]'
          : 'bg-[var(--bg-card)] border border-[#1F2A26]'}
      `}
      style={{
        animationDelay: `${index * 80}ms`,
        ['--category-color' as string]: categoryColor,
      }}
    >
      {/* Content */}
      <div className={`p-5 ${featured ? 'md:p-6' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            {/* Meta row - Source more prominent than time */}
            <div className="flex items-center gap-3 mb-3">
              {article.source_name && (
                <span
                  className="text-xs font-medium px-2 py-1 rounded border"
                  style={{
                    color: categoryColor,
                    borderColor: categoryColor,
                  }}
                >
                  {article.source_name}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-[11px] text-[#6E857B]">
                <Clock size={11} />
                {formattedDate}
              </span>
            </div>

            {/* Title - Softer green for reading comfort, full neon on hover */}
            <h3 className={`
              font-display font-semibold text-[var(--text-primary)] leading-snug
              group-hover:text-[var(--accent-headline)] transition-colors duration-200
              ${featured ? 'text-xl md:text-2xl' : 'text-base'}
              line-clamp-2
            `}>
              {article.title}
            </h3>
          </div>

          {/* External link indicator */}
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center border border-[var(--border-subtle)] rounded-md group-hover:border-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] transition-all">
            <ArrowUpRight
              size={14}
              className="text-[var(--text-muted)] group-hover:text-[var(--bg-primary)] transition-colors"
            />
          </div>
        </div>

        {/* Summary */}
        {article.summary && (
          <p className={`
            text-[var(--text-secondary)] leading-relaxed mb-5
            ${featured ? 'text-sm md:text-base line-clamp-4' : 'text-sm line-clamp-2'}
          `}>
            {article.summary}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-[var(--border-subtle)]">
          {/* Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {article.ai_tags?.slice(0, featured ? 4 : 3).map((tag, idx) => (
              <span key={idx} className="tag-pill">
                {tag}
              </span>
            ))}
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-3">
            {article.sentiment && (
              <span
                className={`
                  text-xs font-medium px-2 py-1 rounded
                  ${article.sentiment === 'positive' ? 'text-[var(--accent-primary)] bg-[var(--accent-glow)]' :
                    article.sentiment === 'negative' ? 'text-[#F87171] bg-[#2A1414]' :
                    'text-[var(--text-secondary)] bg-[var(--bg-tertiary)]'}
                `}
              >
                {article.sentiment}
              </span>
            )}

            {relevancePercent !== null && (
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <TrendingUp size={12} />
                <span className="font-medium">{relevancePercent}%</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
