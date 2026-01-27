'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  Zap,
  ArrowLeft,
  Newspaper,
  Shield
} from 'lucide-react';
import { format, isToday } from 'date-fns';

export type TabType = 'digest' | 'newsletter';

interface HeaderProps {
  selectedDate: Date | null;
  availableDates: string[];
  onDateChange: (date: Date) => void;
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onLogoClick?: () => void;
}

export default function Header({
  selectedDate,
  availableDates,
  onDateChange,
  currentTab,
  onTabChange,
  onLogoClick
}: HeaderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Update time every second - only on client
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleGoToToday = () => {
    onDateChange(new Date());
    setShowDatePicker(false);
  };

  const isViewingToday = selectedDate ? isToday(selectedDate) : true;

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Tabs */}
          <div className="flex items-center gap-6">
            {/* Logo - Clickable to go home */}
            <button
              onClick={onLogoClick}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative">
                <div className="w-9 h-9 border border-[var(--accent-primary)] flex items-center justify-center rounded-lg">
                  <Zap size={18} className="text-[var(--accent-primary)]" strokeWidth={2} />
                </div>
              </div>
              <div className="text-left">
                <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
                  Bmosan Daily News Feed
                </h1>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                  <span className="font-display text-xs text-[var(--text-muted)]">
                    Live Feed
                  </span>
                </div>
              </div>
            </button>

            {/* Divider */}
            <div className="hidden md:block w-px h-8 bg-[var(--border-subtle)]" />

            {/* Tab Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onTabChange('digest')}
                className={`
                  flex items-center gap-2 px-4 py-2 font-display text-sm font-medium
                  transition-all duration-200 rounded-md
                  ${currentTab === 'digest'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-hover)]'
                  }
                `}
              >
                <Newspaper size={16} />
                Daily Digest
              </button>
              <button
                onClick={() => onTabChange('newsletter')}
                className={`
                  flex items-center gap-2 px-4 py-2 font-display text-sm font-medium
                  transition-all duration-200 rounded-md
                  ${currentTab === 'newsletter'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--surface-hover)]'
                  }
                `}
              >
                <Shield size={16} />
                tl;dr sec
              </button>
            </nav>
          </div>

          {/* Center - Live Clock & Date Selector (only show date selector on digest tab) */}
          <div className="hidden md:flex items-center gap-6">
            {/* Live Clock */}
            <div className="font-display text-sm text-[var(--text-muted)] min-w-[70px] font-mono">
              {currentTime ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
            </div>

            {/* Date Selector - only show on digest tab */}
            {currentTab === 'digest' && (
              <>
                {/* Divider */}
                <div className="w-px h-5 bg-[var(--border-subtle)]" />

                <div className="relative flex items-center gap-3">
                  {/* Back to Today Button - shows when viewing archive */}
                  {!isViewingToday && (
                    <button
                      onClick={handleGoToToday}
                      className="flex items-center gap-2 px-3 py-2 border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-[var(--bg-primary)] transition-all duration-200 rounded-md group"
                    >
                      <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                      <span className="font-display text-sm font-medium">
                        Today
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`
                      flex items-center gap-3 px-4 py-2 border transition-all rounded-md group
                      ${!isViewingToday
                        ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]'
                      }
                    `}
                  >
                    <Calendar size={14} className={`transition-colors ${!isViewingToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]'}`} />
                    <span className={`font-display text-sm font-medium ${!isViewingToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {isViewingToday ? 'Today' : (selectedDate ? format(selectedDate, 'MMM d, yyyy') : '')}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''} ${!isViewingToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}
                    />
                  </button>

                  {/* Date Dropdown */}
                  {showDatePicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDatePicker(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 w-72 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl z-50 animate-fade-in rounded-lg overflow-hidden">
                    {/* Today Option */}
                    <button
                      onClick={handleGoToToday}
                      className={`
                        w-full text-left px-4 py-3 text-sm transition-all
                        flex items-center justify-between border-b border-[var(--border-subtle)]
                        ${isViewingToday
                          ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)]'
                          : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
                        </span>
                        <span className="font-medium">Today</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {format(new Date(), 'MMM d')}
                      </span>
                    </button>

                    <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                      <span className="font-display text-xs text-[var(--text-muted)]">
                        Archive Dates
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {availableDates.length > 0 ? (
                        availableDates.map((dateStr, index) => {
                          const date = new Date(dateStr);
                          const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                          const dateIsToday = isToday(date);

                          // Skip today in archive list since it's shown above
                          if (dateIsToday) return null;

                          return (
                            <button
                              key={dateStr}
                              onClick={() => {
                                onDateChange(date);
                                setShowDatePicker(false);
                              }}
                              className={`
                                w-full text-left px-4 py-3 text-sm transition-all
                                flex items-center justify-between
                                ${isSelected
                                  ? 'bg-[var(--accent-glow)] text-[var(--accent-primary)] border-l-2 border-[var(--accent-primary)]'
                                  : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border-l-2 border-transparent'
                                }
                              `}
                              style={{ animationDelay: `${index * 30}ms` }}
                            >
                              <span className="font-medium">
                                {format(date, 'EEEE, MMM d')}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">
                                {format(date, 'yyyy')}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-center text-[var(--text-muted)] py-6 text-sm">
                          No archives available
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex items-center justify-center gap-2 py-3 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => onTabChange('digest')}
            className={`
              flex items-center gap-2 px-4 py-2 font-display text-sm font-medium
              transition-all duration-200 rounded-md flex-1 justify-center
              ${currentTab === 'digest'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]'
              }
            `}
          >
            <Newspaper size={16} />
            Digest
          </button>
          <button
            onClick={() => onTabChange('newsletter')}
            className={`
              flex items-center gap-2 px-4 py-2 font-display text-sm font-medium
              transition-all duration-200 rounded-md flex-1 justify-center
              ${currentTab === 'newsletter'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]'
              }
            `}
          >
            <Shield size={16} />
            tl;dr sec
          </button>
        </div>
      </div>

    </header>
  );
}
