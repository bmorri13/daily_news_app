import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Newsreader } from 'next/font/google';
import './globals.css';

// Serif for headlines, clean sans for UI and body copy
const serif = Newsreader({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

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
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="antialiased">
        {children}
      </body>
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
    </html>
  );
}
