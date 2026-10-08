'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, isToday } from 'date-fns';
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
import { CATEGORY_ORDER, getCategory } from '@/lib/categories';

function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState<TabType>('digest');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
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

  const fetchData = useCallback(async (date: Date | null) => {
    setLoading(true);
    setError(null);

    try {
      // First fetch available dates to get the most recent
      const datesData = await getAvailableDates();
      setAvailableDates(datesData.dates);

      // Use provided date, or default to most recent available date
      let targetDate = date;
      if (!targetDate && datesData.dates.length > 0) {
        targetDate = new Date(datesData.dates[0] + 'T00:00:00');
        setSelectedDate(targetDate);
      }

      const dateStr = targetDate ? format(targetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      const digestData = await getDailyDigest(dateStr);

      setDigest(digestData);
    } catch (err) {
      console.error('Failed to fetch digest:', err);
      setError("We couldn't load the digest. Check your connection and try again.");
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
    if (initialLoad) {
      // On initial load, fetch without a date to get the most recent
      fetchData(null);
      fetchStats();
      setInitialLoad(false);
    } else if (selectedDate) {
      // After initial load, fetch data for the selected date
      fetchData(selectedDate);
    }
  }, [selectedDate, initialLoad, fetchData, fetchStats]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleFilterClick = (category: string | null) => {
    // Clicking the active filter toggles back to all
    setActiveFilter(activeFilter === category ? null : category);
    scrollToTop();
  };

  const handleLogoClick = () => {
    // Reset to home state: digest tab, all articles, scroll to top
    setCurrentTab('digest');
    setActiveFilter(null);
    scrollToTop();
  };

  const hasArticles = !!digest && digest.total_articles > 0;
  const showFilters = currentTab === 'digest' && hasArticles && !loading;

  // Filter categories based on active filter
  const displayedCategories = activeFilter
    ? CATEGORY_ORDER.filter(cat => cat === activeFilter)
    : CATEGORY_ORDER;

  const filterOptions = [
    { key: null, label: 'All', color: null, count: digest?.total_articles || 0 },
    ...CATEGORY_ORDER.map(category => {
      const meta = getCategory(category);
      return {
        key: category,
        label: meta.shortLabel,
        color: meta.color,
        count: digest?.categories[category]?.length || 0,
      };
    }),
  ];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header and filters share one sticky container so they never overlap */}
      <div className="sticky top-0 z-50 bg-[color-mix(in_oklch,var(--bg)_92%,transparent)] backdrop-blur-md">
        <Header
          selectedDate={selectedDate}
          availableDates={availableDates}
          onDateChange={handleDateChange}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          onLogoClick={handleLogoClick}
        />

        {showFilters && (
          <div className="border-b border-line">
            <div
              role="group"
              aria-label="Filter by category"
              className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center gap-2 py-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {filterOptions.map(option => {
                const isActive = activeFilter === option.key;
                return (
                  <button
                    key={option.key ?? 'all'}
                    onClick={() => handleFilterClick(option.key)}
                    aria-pressed={isActive}
                    className={`
                      flex items-center gap-2 h-9 px-3.5 rounded-full border text-sm font-medium whitespace-nowrap
                      transition-colors duration-150
                      ${isActive
                        ? 'bg-surface-raised border-line-strong text-fg'
                        : 'border-line text-fg-muted hover:text-fg hover:border-line-strong'
                      }
                    `}
                  >
                    {option.color && (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} aria-hidden />
                    )}
                    {option.label}
                    <span className="text-fg-subtle tabular-nums">{option.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-12 xl:gap-16">
          {/* Main content */}
          <div id="main-panel" role="tabpanel" className="flex-1 min-w-0">
            {currentTab === 'digest' ? (
              <>
                {error && (
                  <div role="alert" className="mt-10 p-5 rounded-xl border border-line">
                    <p className="font-medium text-fg mb-1">Something went wrong</p>
                    <p className="text-sm text-fg-muted mb-4">{error}</p>
                    <button
                      onClick={() => fetchData(selectedDate)}
                      className="h-9 px-4 rounded-md border border-line-strong text-sm font-medium text-fg hover:bg-surface-raised transition-colors duration-150"
                    >
                      Try again
                    </button>
                  </div>
                )}

                {loading ? (
                  <DigestSkeleton />
                ) : hasArticles ? (
                  <>
                    {/* Dateline */}
                    <header className="pt-10 pb-12">
                      <p className="text-sm text-fg-subtle mb-1">
                        {selectedDate && isToday(selectedDate) ? "Today's digest" : 'Daily digest'}
                      </p>
                      <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-fg">
                        {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : ''}
                      </h2>
                    </header>

                    {displayedCategories.map(category => (
                      <CategorySection
                        key={category}
                        category={category}
                        articles={(digest?.categories[category] || []).slice(0, 5)}
                        onArticleClick={handleArticleClick}
                      />
                    ))}
                  </>
                ) : (
                  !error && <EmptyState />
                )}
              </>
            ) : (
              <TldrNewsletter />
            )}
          </div>

          {/* Sidebar - only on the digest tab */}
          {currentTab === 'digest' && (
            <aside className="lg:w-72 flex-shrink-0 lg:pt-10">
              <div className="lg:sticky lg:top-36">
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

      <ArticleModal
        article={selectedArticle}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
