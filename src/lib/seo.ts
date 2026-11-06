import type { Metadata } from 'next';
import type { PublicSettings } from '@/models/Settings';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'PMB UNJANI';

export const DEFAULT_DESCRIPTION =
  'Penerimaan Mahasiswa Baru Universitas Jenderal Achmad Yani (UNJANI). Informasi jalur seleksi, jadwal, biaya pendidikan, manual pendaftaran, dan kalkulator PMB resmi.';

export type PublicLocale = 'id' | 'en';

function localizedPath(path: string, locale: PublicLocale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'id') return normalizedPath;
  return normalizedPath === '/' ? '/en' : `/en${normalizedPath}`;
}

export function buildMetadata(opts: {
  title?: string;
  description?: string;
  path: string;
  locale: PublicLocale;
  image?: string;
  noIndex?: boolean;
  /** Konten belum diterjemahkan: tanpa varian en di hreflang, dan halaman /en menjadi noindex. */
  hanyaId?: boolean;
}): Metadata {
  const title = opts.title ? `${opts.title} — ${SITE_NAME}` : `${SITE_NAME} — Penerimaan Mahasiswa Baru UNJANI`;
  const description = opts.description || DEFAULT_DESCRIPTION;
  const { path, locale } = opts;
  const url = `${SITE_URL}${localizedPath(path, locale)}`;
  const idUrl = `${SITE_URL}${localizedPath(path, 'id')}`;
  const enUrl = `${SITE_URL}${localizedPath(path, 'en')}`;
  const image = opts.image || `${SITE_URL}/og-default.png`;
  const noIndex = opts.noIndex || (opts.hanyaId && locale === 'en');
  return {
    title: { absolute: title },
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: url,
      languages: opts.hanyaId
        ? { id: idUrl, 'x-default': idUrl }
        : { id: idUrl, en: enUrl, 'x-default': idUrl },
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: locale === 'en' ? 'en_US' : 'id_ID',
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Serialisasi JSON-LD yang aman disisipkan ke <script>. JSON.stringify tidak meng-escape
 * "<", sehingga teks seperti "</script>" bisa menutup blok. Karakter berbahaya diganti
 * escape Unicode (tetap JSON valid, hasil parse identik).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

/** Format ID Google Analytics/Tag yang diterima, mis. G-ABCDE12345. Hanya huruf besar, angka, dan "-". */
const GOOGLE_ANALYTICS_ID_PATTERN = /^(G|GT|AW)-[A-Z0-9]{4,20}$/;

export function isValidGoogleAnalyticsId(value: string): boolean {
  return GOOGLE_ANALYTICS_ID_PATTERN.test(value);
}

/** Logo yang benar-benar ada di public/ (nama berspasi, jadi di-encode). Rename ditunda (SPEC D-10). */
export const LOGO_URL = `${SITE_URL}/logo-pmb-unjani%20(1).png`;

export function organizationJsonLd(settings?: PublicSettings | null) {
  const email = settings?.email?.trim();
  const telepon = settings?.telepon?.trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'CollegeOrUniversity',
    '@id': `${SITE_URL}/#organization`,
    name: 'Universitas Jenderal Achmad Yani',
    alternateName: ['UNJANI', 'PMB UNJANI'],
    url: 'https://www.unjani.ac.id/',
    logo: LOGO_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings?.alamat?.trim() || 'Jl. Terusan Jenderal Sudirman',
      addressLocality: 'Cimahi',
      addressRegion: 'Jawa Barat',
      addressCountry: 'ID',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'admissions',
        ...(email ? { email } : {}),
        ...(telepon ? { telephone: telepon } : {}),
        availableLanguage: ['id', 'en'],
      },
    ],
    sameAs: ['https://www.unjani.ac.id/', ...(settings?.sosmed?.map((s) => s.url).filter(Boolean) ?? [])],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'id-ID',
  };
}

/** JSON-LD FAQPage. Teks sama dengan yang tampil di halaman; null bila tidak ada pertanyaan. */
export function faqPageJsonLd(items: { pertanyaan: string; jawaban: string }[]) {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.pertanyaan,
      acceptedAnswer: { '@type': 'Answer', text: item.jawaban },
    })),
  };
}
