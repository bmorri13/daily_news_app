'use client';

import { Article } from '@/lib/api';
import { getCategory } from '@/lib/categories';
import ArticleCard from './ArticleCard';

interface CategorySectionProps {
  category: string;
  articles: Article[];
  onArticleClick?: (article: Article) => void;
}

export default function CategorySection({ category, articles, onArticleClick }: CategorySectionProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  const { label, description, color } = getCategory(category);
  const [lead, ...rest] = articles;
  const headingId = `${category}-heading`;

  return (
    <section id={category} aria-labelledby={headingId} className="scroll-mt-40 mb-16 last:mb-0">
      {/* Section header */}
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-3 mb-6 border-b border-line">
        <h2 id={headingId} className="flex items-center gap-2.5 font-serif text-2xl font-medium tracking-tight text-fg">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} aria-hidden />
          {label}
        </h2>
        <p className="text-sm text-fg-subtle">{description}</p>
      </header>

      {/* Lead story beside a list of the rest; fills cleanly at any count */}
      <div
        className={`grid gap-x-12 gap-y-8 ${rest.length > 0 ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}
      >
        <ArticleCard article={lead} featured onClick={() => onArticleClick?.(lead)} />

        {rest.length > 0 && (
          <div className="divide-y divide-[var(--border)] pt-8 border-t border-line lg:pt-0 lg:border-t-0 lg:pl-12 lg:border-l">
            {rest.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                onClick={() => onArticleClick?.(article)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
