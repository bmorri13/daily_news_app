'use client';

import { Shield, Brain, Cloud, Bitcoin, ArrowRight } from 'lucide-react';
import { Article, getCategoryColor, getCategoryLabel } from '@/lib/api';
import ArticleCard from './ArticleCard';

interface CategorySectionProps {
  category: string;
  articles: Article[];
  sectionIndex?: number;
  onArticleClick?: (article: Article) => void;
  onViewArchive?: (category: string) => void;
}

const categoryIcons: { [key: string]: React.ReactNode } = {
  cyber: <Shield size={18} strokeWidth={2} />,
  ai: <Brain size={18} strokeWidth={2} />,
  cloud: <Cloud size={18} strokeWidth={2} />,
  crypto: <Bitcoin size={18} strokeWidth={2} />,
};

const categoryDescriptions: { [key: string]: string } = {
  cyber: 'Latest threats, vulnerabilities, and security intelligence',
  ai: 'Machine learning breakthroughs and AI industry news',
  cloud: 'Infrastructure, DevOps, and cloud platform updates',
  crypto: 'Blockchain developments and market movements',
};

export default function CategorySection({ category, articles, sectionIndex = 0, onArticleClick, onViewArchive }: CategorySectionProps) {
  const color = getCategoryColor(category);
  const label = getCategoryLabel(category);
  const icon = categoryIcons[category];
  const description = categoryDescriptions[category];

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section
      id={category}
      className="mb-14 animate-fade-in-up"
      style={{ animationDelay: `${sectionIndex * 150}ms` }}
    >
      {/* Section Header */}
      <div className="mb-6">
        {/* Top line with category indicator */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="flex items-center justify-center w-10 h-10 border rounded-lg"
            style={{
              borderColor: color,
              color: color,
            }}
          >
            {icon}
          </div>

          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}50 0%, transparent 100%)` }} />

          <span className="font-display text-sm text-[var(--text-muted)]">
            {articles.length} {articles.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {/* Title row */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2
              className="font-display text-2xl md:text-3xl font-bold mb-1"
              style={{ color }}
            >
              {label}
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              {description}
            </p>
          </div>

          <button
            onClick={() => onViewArchive?.(category)}
            className="hidden md:flex items-center gap-2 px-4 py-2 border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all rounded-md group"
          >
            <span className="font-display text-sm text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors">
              View Archive
            </span>
            <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
          </button>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article, index) => (
          <ArticleCard
            key={article.id}
            article={article}
            featured={index === 0 && articles.length > 3}
            index={index}
            onClick={() => onArticleClick?.(article)}
          />
        ))}
      </div>

      {/* Section bottom divider */}
      <div className="mt-10 h-px bg-[var(--border-subtle)]" />
    </section>
  );
}
