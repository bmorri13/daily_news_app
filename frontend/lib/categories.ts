// Single source of truth for category display metadata.
// Colors reference the OKLCH tokens defined in app/globals.css.

export const CATEGORY_ORDER = ['cyber', 'ai', 'cloud', 'crypto'];

export interface CategoryMeta {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

const CATEGORIES: { [key: string]: CategoryMeta } = {
  cyber: {
    label: 'Cyber Security',
    shortLabel: 'Security',
    description: 'Threats, vulnerabilities, and security research',
    color: 'var(--cat-cyber)',
  },
  ai: {
    label: 'Artificial Intelligence',
    shortLabel: 'AI',
    description: 'Models, research, and the AI industry',
    color: 'var(--cat-ai)',
  },
  cloud: {
    label: 'Cloud Engineering',
    shortLabel: 'Cloud',
    description: 'Infrastructure, DevOps, and platform updates',
    color: 'var(--cat-cloud)',
  },
  crypto: {
    label: 'Cryptocurrency',
    shortLabel: 'Crypto',
    description: 'Blockchain developments and market moves',
    color: 'var(--cat-crypto)',
  },
};

export function getCategory(category: string): CategoryMeta {
  return (
    CATEGORIES[category] ?? {
      label: category,
      shortLabel: category,
      description: '',
      color: 'var(--fg-subtle)',
    }
  );
}
