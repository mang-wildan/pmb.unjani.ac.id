import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { PublicSettings } from '@/models/Settings';

function SosmedIcon({ nama }: { nama: string }) {
  const n = nama.toLowerCase();
  if (n.includes('instagram'))
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    );
  if (n.includes('tiktok'))
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
      </svg>
    );
  if (n.includes('youtube'))
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
      </svg>
    );
  if (n.includes('facebook'))
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    );
  if (n.includes('twitter') || n.includes('x'))
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default async function Footer({ settings }: { settings: PublicSettings | null }) {
  const t = await getTranslations('footer');
  const year = new Date().getFullYear();
  const campusLocations = [
    {
      name: t('kampusCimahi'),
      address: 'Jl. Terusan Jend. Sudirman, Cibeber, Kec. Cimahi Sel., Kota Cimahi, Jawa Barat',
      mapUrl: 'https://maps.app.goo.gl/cmgjbBHR3Sh6EQW27',
    },
    {
      name: t('kampusBandung'),
      address: 'Jl. Terusan Jenderal Gatot Subroto PO Box 807 Bandung, Jawa Barat',
      mapUrl: 'https://maps.app.goo.gl/KHYhprih9Z8my94F8',
    },
  ];

  return (
    <footer className="mt-20 border-t border-brand-50 bg-gradient-to-b from-white to-brand-50/40">
      <div className="container mx-auto py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-pmb-unjani (1).png"
              alt="Logo PMB UNJANI"
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <Image
              src="/LOGO-AKREDITASI-UNGGUL.png"
              alt="Akreditasi Unggul"
              width={40}
              height={40}
              className="h-10 w-auto object-contain"
            />
            <span className="font-display text-lg font-bold text-brand-700">PMB UNJANI</span>
          </div>
          <p className="mt-4 max-w-md text-sm text-ink-muted leading-relaxed">
            {settings?.tagline ||
              'Gerbang masa depanmu di Universitas Jenderal Achmad Yani. Informasi resmi Penerimaan Mahasiswa Baru.'}
          </p>
          <p className="mt-4 text-sm text-ink-muted">
            {settings?.alamat || 'Jl. Terusan Jenderal Sudirman, Cimahi, Jawa Barat'}
          </p>
          {settings?.email && (
            <p className="mt-1 text-sm text-ink-muted">
              {t('email')}{' '}
              <a href={`mailto:${settings.email}`} className="text-brand-700 hover:underline">
                {settings.email}
              </a>
            </p>
          )}
          {settings?.telepon && (
            <p className="text-sm text-ink-muted">
              {t('telepon')} {settings.telepon}
            </p>
          )}
          {settings?.sosmed && settings.sosmed.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              {settings.sosmed.map((s: { nama: string; url: string }) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.nama}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand hover:text-white transition"
                >
                  <SosmedIcon nama={s.nama} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-ink mb-3">{t('informasi')}</h3>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>
              <Link href="/biaya-kuliah" className="hover:text-brand-700">
                {t('kalkulatorPmb')}
              </Link>
            </li>
            <li>
              <Link href="/jalur-masuk" className="hover:text-brand-700">
                {t('jalurSeleksi')}
              </Link>
            </li>
            <li>
              <Link href="/jadwal-pmb" className="hover:text-brand-700">
                {t('jadwal')}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-brand-700">
                {t('faq')}
              </Link>
            </li>
            <li>
              <a
                href="https://unjani.ac.id"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-700"
              >
                UNJANI
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-ink mb-3">{t('pendaftaran')}</h3>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>
              <a
                href={settings?.urlPendaftaran || 'https://pendaftaran.unjani.ac.id/loginnew'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-700"
              >
                {t('portalPendaftaran')}
              </a>
            </li>
            <li>
              <Link href="/pengumuman" className="hover:text-brand-700">
                {t('pengumuman')}
              </Link>
            </li>
            <li>
              <Link href="/kontak" className="hover:text-brand-700">
                {t('kontakPanitia')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="container mx-auto pb-10">
        <h3 className="font-semibold text-ink mb-4">{t('lokasiKampus')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {campusLocations.map((campus) => (
            <div
              key={campus.name}
              className="rounded-3xl border border-brand-100 bg-white/90 p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-brand-700">{campus.name}</p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <a
                  href={campus.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-sm leading-relaxed text-ink-muted transition hover:text-brand-700 hover:underline"
                >
                  {campus.address}
                </a>
                <a
                  href={campus.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand hover:text-white"
                >
                  {t('bukaDiMaps')}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-brand-50">
        <div className="container mx-auto py-4 text-center text-xs text-ink-muted">
          <p>{t('copyright', { year })}</p>
        </div>
      </div>
    </footer>
  );
}
