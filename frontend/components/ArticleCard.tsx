'use client';

import { formatDistanceToNow } from 'date-fns';
import { Article } from '@/lib/api';

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  onClick?: () => void;
}

export default function ArticleCard({ article, featured = false, onClick }: ArticleCardProps) {
  const formattedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true })
    : null;

  return (
    <article className={`story group ${featured ? '' : 'py-5 first:pt-0 last:pb-0'}`}>
      {/* Meta */}
      <p className="flex items-center gap-2 text-xs text-fg-subtle mb-2">
        {article.source_name && (
          <span className="font-medium text-fg-muted">{article.source_name}</span>
        )}
        {article.source_name && formattedDate && <span aria-hidden>·</span>}
        {formattedDate && <time dateTime={article.published_at ?? undefined}>{formattedDate}</time>}
      </p>

      {/* Headline — the stretched button makes the whole story clickable */}
      <h3
        className={`
          font-serif font-medium text-fg tracking-tight text-pretty
          ${featured ? 'text-2xl md:text-3xl mb-3' : 'text-lg leading-snug'}
        `}
      >
        <button
          type="button"
          onClick={onClick}
          className="story-link text-left underline decoration-transparent decoration-1 underline-offset-4 transition-[text-decoration-color] duration-150 group-hover:decoration-[var(--border-strong)]"
        >
          {article.title}
        </button>
      </h3>

      {/* Summary — always on the lead story; on compact stories only below lg */}
      {article.summary && (
        <p
          className={`
            text-fg-muted
            ${featured ? 'text-base line-clamp-4 max-w-[65ch]' : 'mt-1.5 text-sm line-clamp-2 lg:hidden'}
          `}
        >
          {article.summary}
        </p>
      )}
    </article>
  );
}
