'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Shield, Brain, Cloud, Bitcoin } from 'lucide-react';
import Header, { TabType } from '@/components/Header';
import CategorySection from '@/components/CategorySection';
import StatsPanel from '@/components/StatsPanel';
import EmptyState from '@/components/EmptyState';
import ArticleModal from '@/components/ArticleModal';
import TldrNewsletter from '@/components/TldrNewsletter';
import { DigestSkeleton, StatsPanelSkeleton } from '@/components/LoadingSkeleton';
import {
  getDailyDigest,
  getAvailableDates,
  getStats,
  DailyDigest,
  Stats,
  Article
} from '@/lib/api';

// Category order for display
const CATEGORY_ORDER = ['cyber', 'ai', 'cloud', 'crypto'];

const categoryConfig: { [key: string]: { label: string; color: string; icon: React.ReactNode } } = {
  cyber: { label: 'Security', color: '#3EE98A', icon: <Shield size={16} /> },
  ai: { label: 'AI', color: '#4FD1C5', icon: <Brain size={16} /> },
  cloud: { label: 'Cloud', color: '#4FD1C5', icon: <Cloud size={16} /> },
  crypto: { label: 'Crypto', color: '#F2B84B', icon: <Bitcoin size={16} /> },
};

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>('digest');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  const fetchData = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const [digestData, datesData] = await Promise.all([
        getDailyDigest(dateStr),
        getAvailableDates(),
      ]);

      setDigest(digestData);
      setAvailableDates(datesData.dates);
    } catch (err) {
      console.error('Failed to fetch digest:', err);
      setError('Failed to load news digest. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedDate);
    fetchStats();
  }, [selectedDate, fetchData, fetchStats]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleFilterClick = (category: string | null) => {
    if (activeFilter === category) {
      setActiveFilter(null); // Toggle off
    } else {
      setActiveFilter(category);
    }
    // Always scroll to top when clicking filter
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoClick = () => {
    // Reset to home state: digest tab, all articles, scroll to top
    setCurrentTab('digest');
    setActiveFilter(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasArticles = digest && digest.total_articles > 0;

  // Filter categories based on active filter
  const displayedCategories = activeFilter
    ? CATEGORY_ORDER.filter(cat => cat === activeFilter)
    : CATEGORY_ORDER;

  return (
    <div className="min-h-screen relative bg-[var(--bg-primary)]">

      <Header
        selectedDate={selectedDate}
        availableDates={availableDates}
        onDateChange={handleDateChange}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onLogoClick={handleLogoClick}
      />

      {/* Category Filter Bar - only show on digest tab */}
      {currentTab === 'digest' && hasArticles && !loading && (
        <div className="sticky top-16 z-40 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)]">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
            <div className="flex items-center gap-3 py-4 overflow-x-auto scrollbar-hide">
              {/* All button */}
              <button
                onClick={() => handleFilterClick(null)}
                className={`
                  flex items-center gap-2 px-4 py-2 font-display text-sm font-medium
                  transition-all duration-200 whitespace-nowrap border rounded-md
                  ${activeFilter === null
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] border-[var(--accent-primary)]'
                    : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                  }
                `}
              >
                All
                <span className={`
                  ml-1 px-1.5 py-0.5 text-xs rounded
                  ${activeFilter === null
                    ? 'bg-[var(--bg-primary)]/20 text-[var(--bg-primary)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                  }
                `}>
                  {digest?.total_articles || 0}
                </span>
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-[var(--border-subtle)]" />

              {/* Category buttons */}
              {CATEGORY_ORDER.map((category) => {
                const config = categoryConfig[category];
                const count = digest?.categories[category]?.length || 0;
                const isActive = activeFilter === category;

                return (
                  <button
                    key={category}
                    onClick={() => handleFilterClick(category)}
                    className={`
                      flex items-center gap-2 px-4 py-2 font-display text-sm font-medium
                      transition-all duration-200 whitespace-nowrap border rounded-md
                      ${isActive
                        ? 'border-current'
                        : 'bg-transparent border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]'
                      }
                    `}
                    style={{
                      color: isActive ? config.color : 'var(--text-secondary)',
                      backgroundColor: isActive ? `${config.color}15` : 'transparent',
                      borderColor: isActive ? config.color : undefined,
                    }}
                  >
                    <span style={{ color: isActive ? config.color : 'var(--text-muted)' }}>
                      {config.icon}
                    </span>
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="sm:hidden">{category === 'ai' ? 'AI' : config.label.split(' ')[0]}</span>
                    <span
                      className="ml-1 px-1.5 py-0.5 text-xs rounded"
                      style={{
                        backgroundColor: isActive ? `${config.color}20` : 'var(--bg-tertiary)',
                        color: isActive ? config.color : 'var(--text-muted)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 pb-16 relative">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {currentTab === 'digest' ? (
              <>
                {error && (
                  <div className="bg-[var(--bg-secondary)] border border-red-500/50 p-5 mb-8 animate-fade-in rounded-lg">
                    <p className="text-red-400 font-display text-sm font-medium mb-1">
                      Connection Error
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {error}
                    </p>
                  </div>
                )}

                {loading ? (
                  <DigestSkeleton />
                ) : hasArticles ? (
                  <div>
                    {/* Hero Date Header */}
                    <div className="mb-10 pt-6 animate-slide-in-left">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-1 h-10 bg-[var(--accent-primary)] rounded-full" />
                        <div>
                          <p className="font-display text-xs text-[var(--text-muted)] mb-1">
                            Daily Digest
                          </p>
                          <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                            {format(selectedDate, 'EEEE')}
                          </h2>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 ml-5">
                        <span className="font-display text-base text-[var(--text-secondary)]">
                          {format(selectedDate, 'MMMM d, yyyy')}
                        </span>
                        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                        <span className="font-display text-sm text-[var(--text-muted)]">
                          {activeFilter
                            ? `${digest?.categories[activeFilter]?.length || 0} articles`
                            : `${digest?.total_articles} articles`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Categories */}
                    {displayedCategories.map((category, index) => {
                      const articles = (digest?.categories[category] || []).slice(0, 5);
                      return (
                        <CategorySection
                          key={category}
                          category={category}
                          articles={articles}
                          sectionIndex={index}
                          onArticleClick={handleArticleClick}
                          onViewArchive={handleFilterClick}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </>
            ) : (
              <TldrNewsletter />
            )}
          </div>

          {/* Sidebar - only show on digest tab */}
          {currentTab === 'digest' && (
            <aside className="lg:w-72 flex-shrink-0">
              <div className="sticky top-36">
                {statsLoading ? (
                  <StatsPanelSkeleton />
                ) : (
                  <StatsPanel stats={stats} />
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Article Modal */}
      <ArticleModal
        article={selectedArticle}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
