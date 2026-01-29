// Types
export interface Article {
  id: number;
  title: string;
  url: string;
  category: string;
  summary: string | null;
  key_points: string[] | null;
  ai_tags: string[] | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  relevance_score: number | null;
  published_at: string | null;
  featured_date: string | null;
  source_name: string | null;
}

export interface DailyDigest {
  date: string;
  categories: {
    [key: string]: Article[];
  };
  total_articles: number;
}

export interface Stats {
  total_articles: number;
  processed_articles: number;
  articles_by_category: {
    [key: string]: number;
  };
  total_sources: number;
  active_sources: number;
  last_fetch: {
    status: string;
    started_at: string;
    articles_fetched: number;
  } | null;
  categories: string[];
  fetch_interval_hours: number;
}

export interface FetchLog {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: string;
  articles_fetched: number;
  articles_processed: number;
  errors: string[] | null;
}

export interface Newsletter {
  id: number;
  title: string;
  url: string;
  content: string | null;
  published_at: string | null;
  fetched_at: string;
  executive_summary: string | null;
  processed: boolean;
}

export interface Source {
  id: number;
  name: string;
  url: string;
  feed_url: string;
  category: string;
  active: boolean;
  created_at: string;
  updated_at: string | null;
}

// API Base URL
// In browser: use NEXT_PUBLIC_API_URL if set, otherwise use relative URLs (for local dev with rewrites)
// On server: use API_URL for internal Docker network communication
const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '') // Client-side: use public API URL or relative
  : (process.env.API_URL || 'http://localhost:8000'); // Server-side: use internal URL

// Fetch wrapper with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    throw error;
  }
}

// API Functions
export async function getDailyDigest(date?: string): Promise<DailyDigest> {
  const params = date ? `?target_date=${date}` : '';
  return fetchApi<DailyDigest>(`/api/digest${params}`);
}

export async function getAvailableDates(): Promise<{ dates: string[] }> {
  return fetchApi<{ dates: string[] }>('/api/digest/dates');
}

export async function getArticles(params?: {
  category?: string;
  featured_date?: string;
  limit?: number;
  offset?: number;
}): Promise<Article[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set('category', params.category);
  if (params?.featured_date) searchParams.set('featured_date', params.featured_date);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  
  const query = searchParams.toString();
  return fetchApi<Article[]>(`/api/articles${query ? `?${query}` : ''}`);
}

export async function getArticle(id: number): Promise<Article> {
  return fetchApi<Article>(`/api/articles/${id}`);
}

export async function getCategoryArticles(
  category: string,
  featuredDate?: string
): Promise<{ category: string; articles: Article[]; total: number }> {
  const params = featuredDate ? `?featured_date=${featuredDate}` : '';
  return fetchApi(`/api/categories/${category}${params}`);
}

export async function getStats(): Promise<Stats> {
  return fetchApi<Stats>('/api/stats');
}

export async function triggerFetch(): Promise<{
  message: string;
  log_id: number;
  status: string;
}> {
  return fetchApi('/api/fetch/trigger', { method: 'POST' });
}

export async function getFetchLogs(limit = 10): Promise<FetchLog[]> {
  return fetchApi<FetchLog[]>(`/api/fetch/logs?limit=${limit}`);
}

export async function getFetchLog(id: number): Promise<FetchLog> {
  return fetchApi<FetchLog>(`/api/fetch/logs/${id}`);
}

export async function getLatestNewsletter(): Promise<Newsletter> {
  return fetchApi<Newsletter>('/api/newsletter/latest');
}

export async function triggerNewsletterFetch(): Promise<{
  message: string;
  newsletter_id: number | null;
  status: string;
}> {
  return fetchApi('/api/newsletter/trigger', { method: 'POST' });
}

export async function getSources(): Promise<Source[]> {
  return fetchApi<Source[]>('/api/sources');
}

// Utility functions - Updated color palette
export function getCategoryColor(category: string): string {
  const colors: { [key: string]: string } = {
    cyber: '#3EE98A',  // Primary green
    ai: '#4FD1C5',     // Cyan (AI/Cloud)
    cloud: '#4FD1C5',  // Cyan (AI/Cloud)
    crypto: '#F2B84B', // Amber
  };
  return colors[category] || '#3EE98A';
}

export function getCategoryLabel(category: string): string {
  const labels: { [key: string]: string } = {
    cyber: 'Cyber Security',
    ai: 'Artificial Intelligence',
    cloud: 'Cloud Engineering',
    crypto: 'Cryptocurrency',
  };
  return labels[category] || category;
}

export function getSentimentEmoji(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return '📈';
    case 'negative':
      return '📉';
    default:
      return '📊';
  }
}
