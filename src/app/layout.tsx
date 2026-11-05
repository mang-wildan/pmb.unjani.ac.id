import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import { headers } from 'next/headers';
import { getLocale } from 'next-intl/server';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '@/styles/globals.css';
import {
  SITE_NAME,
  SITE_URL,
  DEFAULT_DESCRIPTION,
  organizationJsonLd,
  websiteJsonLd,
  serializeJsonLd,
  isValidGoogleAnalyticsId,
} from '@/lib/seo';
import JsonLd from '@/components/public/JsonLd';
import { loadSiteSettings } from '@/lib/siteSettings';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'Universitas Jenderal Achmad Yani' }],
  keywords: [
    'PMB UNJANI',
    'Penerimaan Mahasiswa Baru UNJANI',
    'Universitas Jenderal Achmad Yani',
    'Kalkulator PMB UNJANI',
    'Biaya Kuliah UNJANI',
    'Jalur Seleksi UNJANI',
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/favicon.ico' }],
    apple: [{ url: '/favicon.ico' }],
    shortcut: '/favicon.ico',
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: '#24b47f',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  // Nonce hanya ada pada request /admin (dari src/proxy.ts); skrip GA mentah di bawah tidak diberi
  // nonce otomatis oleh Next.js. Halaman publik tidak punya x-nonce sehingga tidak berubah.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const settings = await loadSiteSettings();
  const rawGoogleAnalyticsId =
    settings?.googleAnalyticsId?.trim() || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();
  // ID yang formatnya tidak valid tidak dirender sama sekali (mencegah injeksi ke script inline).
  const googleAnalyticsId =
    rawGoogleAnalyticsId && isValidGoogleAnalyticsId(rawGoogleAnalyticsId)
      ? rawGoogleAnalyticsId
      : undefined;

  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`}>
      <head>
        {googleAnalyticsId && (
          <>
            <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`} />
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${serializeJsonLd(googleAnalyticsId)});`,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen bg-surface text-ink font-sans antialiased">
        {children}
        <JsonLd data={[organizationJsonLd(settings), websiteJsonLd()]} />
      </body>
    </html>
  );
}
