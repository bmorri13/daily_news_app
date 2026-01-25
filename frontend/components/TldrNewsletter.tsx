'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
  Shield,
  ExternalLink,
  Sparkles,
  AlertCircle,
  FileText,
  AlertTriangle,
  Lightbulb,
  Wrench,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { getLatestNewsletter, Newsletter } from '@/lib/api';

// Parse executive summary into structured sections
function parseExecutiveSummary(summary: string): {
  intro?: string;
  keyThemes?: string[];
  criticalAlerts?: string[];
  tools?: string[];
  trends?: string[];
  takeaways?: string[];
} {
  const sections: ReturnType<typeof parseExecutiveSummary> = {};

  // Split by ## headers
  const parts = summary.split(/(?=##\s)/);

  for (const part of parts) {
    const trimmed = part.trim();

    if (!trimmed.startsWith('##')) {
      // Intro text before first section
      if (trimmed) {
        sections.intro = trimmed.replace(/^Based on.*?:\s*/i, '').trim();
      }
      continue;
    }

    const lines = trimmed.split('\n');
    const header = lines[0].replace(/^##\s*/, '').toLowerCase();
    const items = lines.slice(1)
      .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter(line => line && !line.startsWith('##'));

    if (header.includes('key theme')) {
      sections.keyThemes = items;
    } else if (header.includes('critical alert')) {
      sections.criticalAlerts = items;
    } else if (header.includes('tool') || header.includes('resource')) {
      sections.tools = items;
    } else if (header.includes('trend')) {
      sections.trends = items;
    } else if (header.includes('takeaway') || header.includes('actionable')) {
      sections.takeaways = items;
    }
  }

  return sections;
}

// Format a single item - convert **text** to bold
function FormatItem({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-[var(--text-primary)] font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Summary section component
function SummarySection({
  icon: Icon,
  title,
  items,
  accentColor = 'var(--accent-primary)'
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  accentColor?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} style={{ color: accentColor }} />
        <h4 className="font-display text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {title}
        </h4>
      </div>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className="text-[var(--text-muted)] mt-1.5 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            </span>
            <span><FormatItem text={item} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TldrNewsletter() {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  const fetchNewsletter = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getLatestNewsletter();
      setNewsletter(data);
    } catch (err) {
      console.error('Failed to fetch newsletter:', err);
      setError('No newsletter available yet. Trigger a fetch to load the latest tl;dr sec newsletter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsletter();
  }, []);

  if (loading) {
    return <NewsletterSkeleton />;
  }

  if (error || !newsletter) {
    return (
      <div className="pt-8">
        <EmptyNewsletterState message={error || 'No newsletter available'} />
      </div>
    );
  }

  const summaryData = newsletter.executive_summary
    ? parseExecutiveSummary(newsletter.executive_summary)
    : null;

  return (
    <div className="pt-6 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-1 h-12 bg-[var(--accent-primary)] rounded-full" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center">
              <Shield size={24} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <p className="font-display text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Security Newsletter
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                tl;dr sec
              </h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 ml-5 mt-4">
          {newsletter.published_at && (
            <span className="font-display text-base text-[var(--text-secondary)]">
              {format(new Date(newsletter.published_at), 'EEEE, MMMM d, yyyy')}
            </span>
          )}
          <div className="hidden sm:block h-px flex-1 bg-[var(--border-subtle)]" />
          <a
            href={newsletter.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors font-display text-sm font-medium"
          >
            View Original
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Executive Summary */}
      {summaryData && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles size={20} className="text-[var(--accent-primary)]" />
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
              Executive Summary
            </h3>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-full font-medium">
              AI Generated
            </span>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummarySection
              icon={Lightbulb}
              title="Key Themes"
              items={summaryData.keyThemes || []}
              accentColor="#4FD1C5"
            />
            <SummarySection
              icon={AlertTriangle}
              title="Critical Alerts"
              items={summaryData.criticalAlerts || []}
              accentColor="#F45D5D"
            />
            <SummarySection
              icon={Wrench}
              title="Tools & Resources"
              items={summaryData.tools || []}
              accentColor="#1F6F4A"
            />
            <SummarySection
              icon={TrendingUp}
              title="Industry Trends"
              items={summaryData.trends || []}
              accentColor="#F2B84B"
            />
          </div>

          {/* Actionable Takeaways - Full Width */}
          {summaryData.takeaways && summaryData.takeaways.length > 0 && (
            <div className="mt-4 bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={18} className="text-[var(--accent-primary)]" />
                <h4 className="font-display text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  Actionable Takeaways
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summaryData.takeaways.map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-3 text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-card)] rounded-md p-3"
                  >
                    <span className="text-[var(--accent-primary)] font-bold flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span><FormatItem text={item} /></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Newsletter Title */}
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {newsletter.title}
        </h3>
      </div>

      {/* Full Newsletter Content */}
      {newsletter.content && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            className="w-full flex items-center justify-between gap-2 p-4 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[var(--text-muted)]" />
              <span className="font-display text-sm font-medium text-[var(--text-secondary)]">
                Full Newsletter Content
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
              {showFullContent ? 'Click to collapse' : 'Click to expand'}
            </span>
          </button>

          {showFullContent && (
            <div className="p-6">
              <div
                className="newsletter-content prose prose-invert prose-sm max-w-none overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: newsletter.content }}
              />
            </div>
          )}
        </div>
      )}

      {/* Newsletter Styles */}
      <style jsx global>{`
        .newsletter-content {
          color: var(--text-secondary);
          line-height: 1.7;
        }

        .newsletter-content a {
          color: var(--accent-primary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .newsletter-content a:hover {
          opacity: 0.8;
        }

        .newsletter-content h1,
        .newsletter-content h2,
        .newsletter-content h3,
        .newsletter-content h4,
        .newsletter-content h5,
        .newsletter-content h6 {
          color: var(--text-primary);
          font-family: var(--font-display);
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }

        .newsletter-content h1 {
          font-size: 1.5rem;
        }

        .newsletter-content h2 {
          font-size: 1.25rem;
        }

        .newsletter-content h3 {
          font-size: 1.1rem;
        }

        .newsletter-content p {
          margin-bottom: 1em;
        }

        .newsletter-content ul,
        .newsletter-content ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }

        .newsletter-content li {
          margin-bottom: 0.5em;
        }

        .newsletter-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }

        .newsletter-content blockquote {
          border-left: 3px solid var(--accent-primary);
          padding-left: 1em;
          margin-left: 0;
          color: var(--text-muted);
          font-style: italic;
        }

        .newsletter-content code {
          background: var(--bg-tertiary);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .newsletter-content pre {
          background: var(--bg-tertiary);
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
        }

        .newsletter-content pre code {
          background: none;
          padding: 0;
        }

        .newsletter-content hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 2em 0;
        }

        .newsletter-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }

        .newsletter-content th,
        .newsletter-content td {
          border: 1px solid var(--border-subtle);
          padding: 0.5em;
          text-align: left;
        }

        .newsletter-content th {
          background: var(--bg-tertiary);
        }
      `}</style>
    </div>
  );
}

function NewsletterSkeleton() {
  return (
    <div className="pt-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-1 h-12 bg-[var(--bg-tertiary)] rounded-full" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-xl" />
            <div>
              <div className="w-28 h-3 bg-[var(--bg-tertiary)] rounded mb-2" />
              <div className="w-36 h-8 bg-[var(--bg-tertiary)] rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Grid Skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-5 h-5 bg-[var(--bg-tertiary)] rounded" />
          <div className="w-40 h-6 bg-[var(--bg-tertiary)] rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-[var(--bg-tertiary)] rounded" />
                <div className="w-24 h-4 bg-[var(--bg-tertiary)] rounded" />
              </div>
              <div className="space-y-3">
                <div className="w-full h-4 bg-[var(--bg-tertiary)] rounded" />
                <div className="w-5/6 h-4 bg-[var(--bg-tertiary)] rounded" />
                <div className="w-4/5 h-4 bg-[var(--bg-tertiary)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[var(--bg-tertiary)] rounded" />
          <div className="w-36 h-4 bg-[var(--bg-tertiary)] rounded" />
        </div>
      </div>
    </div>
  );
}

function EmptyNewsletterState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 border border-[var(--border-subtle)] rounded-xl flex items-center justify-center mb-6">
        <AlertCircle size={32} className="text-[var(--text-muted)]" />
      </div>
      <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] mb-2">
        No Newsletter Available
      </h3>
      <p className="text-[var(--text-muted)] text-center max-w-md mb-6">
        {message}
      </p>
      <p className="text-[var(--text-muted)] text-sm text-center">
        The newsletter will be fetched automatically during the daily sync, or you can trigger a manual fetch from the backend.
      </p>
    </div>
  );
}
