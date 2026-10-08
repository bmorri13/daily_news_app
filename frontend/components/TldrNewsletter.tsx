'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, AlertTriangle, ChevronDown } from 'lucide-react';
import { getLatestNewsletter, Newsletter } from '@/lib/api';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { NewsletterSkeleton } from './LoadingSkeleton';

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
          return <strong key={i} className="text-fg font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Summary section component
function SummarySection({
  title,
  items,
  icon: Icon,
  iconColor,
}: {
  title: string;
  items: string[];
  icon?: React.ElementType;
  iconColor?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="pt-5 border-t border-line">
      <h4 className="flex items-center gap-2 text-base font-semibold text-fg mb-4">
        {Icon && <Icon size={16} style={{ color: iconColor }} aria-hidden />}
        {title}
      </h4>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-sm text-fg-muted leading-relaxed">
            <span className="mt-[0.6rem] w-1 h-1 rounded-full bg-[var(--fg-subtle)] flex-shrink-0" aria-hidden />
            <span><FormatItem text={item} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TldrNewsletter() {
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Newsletter HTML comes from an external site, so treat it as untrusted.
  const safeContent = useMemo(
    () => (newsletter?.content ? sanitizeHtml(newsletter.content) : ''),
    [newsletter?.content]
  );

  useEffect(() => {
    const fetchNewsletter = async () => {
      setLoading(true);
      setError(false);
      try {
        setNewsletter(await getLatestNewsletter());
      } catch (err) {
        console.error('Failed to fetch newsletter:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchNewsletter();
  }, []);

  if (loading) {
    return <NewsletterSkeleton />;
  }

  if (error || !newsletter) {
    return (
      <div className="py-24 max-w-md">
        <h2 className="font-serif text-2xl font-medium tracking-tight text-fg mb-3">
          No newsletter yet
        </h2>
        <p className="text-fg-muted">
          The latest tl;dr sec issue will show up here after the next daily sync.
        </p>
      </div>
    );
  }

  const summaryData = newsletter.executive_summary
    ? parseExecutiveSummary(newsletter.executive_summary)
    : null;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <header className="pt-10 pb-12">
        <p className="text-sm text-fg-subtle mb-2">Security newsletter</p>
        <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-fg">
          tl;dr sec
        </h2>
        <p className="mt-3 text-lg text-fg-muted max-w-[60ch] text-balance">{newsletter.title}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-subtle">
          {newsletter.published_at && (
            <time dateTime={newsletter.published_at}>
              {format(new Date(newsletter.published_at), 'EEEE, MMMM d, yyyy')}
            </time>
          )}
          {newsletter.published_at && <span aria-hidden>·</span>}
          <a
            href={newsletter.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-fg-muted underline decoration-[var(--border-strong)] underline-offset-4 hover:text-fg hover:decoration-[var(--fg-subtle)] transition-colors duration-150"
          >
            Read the original
            <ArrowUpRight size={14} aria-hidden />
          </a>
        </p>
      </header>

      {/* Summary */}
      {summaryData && (
        <section aria-labelledby="newsletter-summary" className="mb-14">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-6">
            <h3 id="newsletter-summary" className="font-serif text-2xl font-medium tracking-tight text-fg">
              Summary
            </h3>
            <span className="text-xs text-fg-subtle">Written by AI from this issue</span>
          </div>

          {summaryData.intro && (
            <p className="text-base text-fg-muted max-w-[65ch] mb-10">
              <FormatItem text={summaryData.intro} />
            </p>
          )}

          <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
            <SummarySection
              title="Critical alerts"
              items={summaryData.criticalAlerts || []}
              icon={AlertTriangle}
              iconColor="var(--negative)"
            />
            <SummarySection title="Key themes" items={summaryData.keyThemes || []} />
            <SummarySection title="Industry trends" items={summaryData.trends || []} />
            <SummarySection title="Tools & resources" items={summaryData.tools || []} />
          </div>

          {summaryData.takeaways && summaryData.takeaways.length > 0 && (
            <section className="mt-10 pt-5 border-t border-line">
              <h4 className="text-base font-semibold text-fg mb-4">What to act on</h4>
              <ol className="grid gap-x-12 gap-y-3 md:grid-cols-2">
                {summaryData.takeaways.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-fg-muted leading-relaxed">
                    <span className="w-4 flex-shrink-0 text-right font-medium text-fg-subtle tabular-nums">
                      {index + 1}
                    </span>
                    <span><FormatItem text={item} /></span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </section>
      )}

      {/* Full issue */}
      {newsletter.content && (
        <section className="rounded-xl border border-line">
          <button
            onClick={() => setShowFullContent(!showFullContent)}
            aria-expanded={showFullContent}
            aria-controls="newsletter-full"
            className="w-full flex items-center justify-between gap-2 px-5 py-4 text-left text-sm font-medium text-fg-muted hover:text-fg transition-colors duration-150"
          >
            {showFullContent ? 'Hide the full issue' : 'Read the full issue here'}
            <ChevronDown
              size={16}
              aria-hidden
              className={`text-fg-subtle transition-transform duration-200 ${showFullContent ? 'rotate-180' : ''}`}
            />
          </button>

          {showFullContent && (
            <div id="newsletter-full" className="px-5 sm:px-8 pb-8 pt-2 border-t border-line">
              <div
                className="newsletter-content max-w-[70ch] overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />
            </div>
          )}
        </section>
      )}

      {/* Embedded newsletter styles - force the app theme on external markup */}
      <style jsx global>{`
        .newsletter-content,
        .newsletter-content * {
          background-color: transparent !important;
          background: transparent !important;
          color: var(--fg-muted) !important;
          font-family: inherit !important;
        }

        .newsletter-content {
          line-height: 1.7;
        }

        .newsletter-content a {
          color: var(--fg) !important;
          text-decoration: underline;
          text-decoration-color: var(--border-strong);
          text-underline-offset: 3px;
        }

        .newsletter-content a:hover {
          text-decoration-color: var(--fg-subtle);
        }

        .newsletter-content h1,
        .newsletter-content h2,
        .newsletter-content h3,
        .newsletter-content h4,
        .newsletter-content h5,
        .newsletter-content h6 {
          color: var(--fg) !important;
          font-family: var(--font-serif), Georgia, serif !important;
          font-weight: 500;
          line-height: 1.3;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }

        .newsletter-content h1 {
          font-size: 1.5625rem;
        }

        .newsletter-content h2 {
          font-size: 1.25rem;
          padding-top: 1em;
          border-top: 1px solid var(--border);
          margin-top: 2em;
        }

        .newsletter-content h3 {
          font-size: 1.125rem;
        }

        .newsletter-content p {
          margin-bottom: 1em;
        }

        .newsletter-content ul,
        .newsletter-content ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }

        .newsletter-content ul {
          list-style: disc;
        }

        .newsletter-content ol {
          list-style: decimal;
        }

        .newsletter-content li {
          margin-bottom: 0.5em;
        }

        .newsletter-content strong,
        .newsletter-content b {
          color: var(--fg) !important;
          font-weight: 600;
        }

        .newsletter-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }

        .newsletter-content blockquote {
          border-left: 2px solid var(--border-strong);
          padding-left: 1em;
          margin-left: 0;
          font-style: italic;
        }

        .newsletter-content code {
          background: var(--surface-raised) !important;
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important;
        }

        .newsletter-content pre {
          background: var(--surface-raised) !important;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
        }

        .newsletter-content pre code {
          background: none !important;
          padding: 0;
        }

        .newsletter-content hr {
          border: none !important;
          border-top: 1px solid var(--border) !important;
          margin: 2em 0;
        }

        .newsletter-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }

        .newsletter-content th,
        .newsletter-content td {
          border: 1px solid var(--border) !important;
          padding: 0.5em;
          text-align: left;
        }

        .newsletter-content th {
          background: var(--surface-raised) !important;
          color: var(--fg) !important;
        }

        /* Hide social sharing buttons and navigation from embedded content */
        .newsletter-content nav,
        .newsletter-content [class*="share"],
        .newsletter-content [class*="social"],
        .newsletter-content button:not([type="submit"]) {
          display: none !important;
        }

        /* Embedded sponsor sections */
        .newsletter-content [class*="sponsor"],
        .newsletter-content [class*="Sponsor"] {
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          border-radius: 8px;
          padding: 1em;
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  );
}
