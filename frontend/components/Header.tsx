'use client';

import { useState, useEffect, useRef, useId, KeyboardEvent } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { format, isToday, isSameDay, parseISO, startOfToday } from 'date-fns';

export type TabType = 'digest' | 'newsletter';

const TABS: { id: TabType; label: string }[] = [
  { id: 'digest', label: 'Daily Digest' },
  { id: 'newsletter', label: 'tl;dr sec' },
];

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
  return (
    <header className="border-b border-line">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-8 min-w-0">
            <button
              onClick={onLogoClick}
              className="text-left min-w-0"
            >
              <h1 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-fg truncate">
                Bmosan Daily<span className="hidden sm:inline"> News Feed</span>
              </h1>
            </button>

            <Tabs
              currentTab={currentTab}
              onTabChange={onTabChange}
              className="hidden md:flex self-stretch"
            />
          </div>

          {currentTab === 'digest' && (
            <DatePicker
              selectedDate={selectedDate}
              availableDates={availableDates}
              onDateChange={onDateChange}
            />
          )}
        </div>

        {/* Mobile tabs */}
        <Tabs
          currentTab={currentTab}
          onTabChange={onTabChange}
          className="md:hidden flex -mb-px h-11"
        />
      </div>
    </header>
  );
}

function Tabs({
  currentTab,
  onTabChange,
  className = '',
}: {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  className?: string;
}) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const index = TABS.findIndex(t => t.id === currentTab);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = TABS[(index + delta + TABS.length) % TABS.length];
    onTabChange(next.id);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons[TABS.indexOf(next)]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Views"
      className={`items-stretch gap-6 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {TABS.map(tab => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls="main-panel"
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center text-sm font-medium transition-colors duration-150
              ${isActive ? 'text-fg' : 'text-fg-subtle hover:text-fg'}
            `}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DatePicker({
  selectedDate,
  availableDates,
  onDateChange,
}: {
  selectedDate: Date | null;
  availableDates: string[];
  onDateChange: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const isViewingToday = selectedDate ? isToday(selectedDate) : true;
  // Dates arrive as yyyy-MM-dd; parseISO reads them in local time
  const archiveDates = availableDates.map(d => parseISO(d)).filter(d => !isToday(d));

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const choose = (date: Date) => {
    onDateChange(date);
    close();
  };

  // Move focus into the panel when it opens
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const current = panel?.querySelector<HTMLButtonElement>('[aria-current="date"]');
    (current ?? panel?.querySelector<HTMLButtonElement>('button'))?.focus();
  }, [open]);

  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const delta = e.key === 'ArrowDown' ? 1 : -1;
    items[(index + delta + items.length) % items.length]?.focus();
  };

  const optionClass = (selected: boolean) => `
    w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left rounded-md
    transition-colors duration-150
    ${selected ? 'bg-surface-raised text-fg' : 'text-fg-muted hover:bg-surface-raised hover:text-fg'}
  `;

  return (
    <div className="relative flex items-center gap-2 flex-shrink-0">
      {!isViewingToday && (
        <button
          onClick={() => onDateChange(startOfToday())}
          className="hidden sm:inline-flex h-9 items-center px-3 text-sm font-medium text-fg-muted hover:text-fg transition-colors duration-150"
        >
          Back to today
        </button>
      )}

      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Choose digest date, currently ${selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'today'}`}
        className="h-9 flex items-center gap-2 px-3 rounded-md border border-line hover:border-line-strong text-sm font-medium text-fg transition-colors duration-150"
      >
        <Calendar size={14} className="text-fg-subtle" aria-hidden />
        <span className="tabular-nums">
          {isViewingToday || !selectedDate ? 'Today' : format(selectedDate, 'MMM d')}
          {!isViewingToday && selectedDate && (
            <span className="hidden sm:inline">{format(selectedDate, ', yyyy')}</span>
          )}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`text-fg-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => close(false)} aria-hidden />
          <div
            ref={panelRef}
            id={panelId}
            onKeyDown={handlePanelKeyDown}
            className="absolute top-full right-0 mt-2 z-50 w-64 max-w-[calc(100vw-2rem)] p-1.5 bg-surface border border-line rounded-lg shadow-2xl shadow-black/40 animate-fade-in"
          >
            <button
              onClick={() => choose(startOfToday())}
              aria-current={isViewingToday ? 'date' : undefined}
              className={optionClass(isViewingToday)}
            >
              <span className="font-medium">Today</span>
              {isViewingToday ? (
                <Check size={14} className="text-accent" aria-hidden />
              ) : (
                <span className="text-xs text-fg-subtle tabular-nums">{format(new Date(), 'MMM d')}</span>
              )}
            </button>

            <p className="px-3 pt-3 pb-1 text-xs text-fg-subtle">Earlier digests</p>
            <div className="max-h-64 overflow-y-auto">
              {archiveDates.length > 0 ? (
                archiveDates.map(date => {
                  const isSelected = !!selectedDate && isSameDay(date, selectedDate);
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => choose(date)}
                      aria-current={isSelected ? 'date' : undefined}
                      className={optionClass(isSelected)}
                    >
                      <span>{format(date, 'EEEE, MMM d')}</span>
                      {isSelected ? (
                        <Check size={14} className="text-accent" aria-hidden />
                      ) : (
                        <span className="text-xs text-fg-subtle tabular-nums">{format(date, 'yyyy')}</span>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-sm text-fg-subtle">No earlier digests yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
