import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bmosan Daily News Feed - AI-Curated Daily News',
  description: 'AI-powered news aggregation for Cyber Security, AI, Cloud Engineering, and Cryptocurrency',
  keywords: ['news', 'tech', 'cybersecurity', 'ai', 'cloud', 'crypto', 'aggregator'],
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
