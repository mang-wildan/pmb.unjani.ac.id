'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { PublicSettings } from '@/models/Settings';
import LanguageSwitcher from './LanguageSwitcher';

const navLinks = [
  { href: '/#manual-book', key: 'manualBook' },
  { href: '/jalur-masuk', key: 'jalurSeleksi' },
  { href: '/biaya-kuliah', key: 'biaya' },
  { href: '/pengumuman', key: 'pengumuman' },
  { href: '/kontak', key: 'kontak' },
] as const;

export default function Navbar({ settings }: { settings: PublicSettings | null }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const urlDaftar = settings?.urlPendaftaran || 'https://pendaftaran.unjani.ac.id/loginnew';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-brand-50">
      <nav aria-label="Navigasi utama" className="container mx-auto flex items-center justify-between py-3">
        <Link href="/" className="flex items-center gap-2" aria-label="Beranda PMB UNJANI">
          <Image
            src="/logo-pmb-unjani (1).png"
            alt="Logo PMB UNJANI"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <Image
            src="/LOGO-AKREDITASI-UNGGUL.png"
            alt="Akreditasi Unggul"
            width={40}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <span className="hidden sm:block font-display font-bold">
            <span className="block text-xs text-ink-muted" style={{ lineHeight: '1' }}>
              Penerimaan Mahasiswa Baru
            </span>
            <span className="block text-lg text-brand-700 text-center" style={{ lineHeight: '1' }}>
              UNJANI
            </span>
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-1">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="px-3 py-2 rounded-full text-sm font-medium text-ink-muted hover:text-brand-700 hover:bg-brand-50 transition"
              >
                {t(l.key)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-2">
          <LanguageSwitcher />
          <a
            href={urlDaftar}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative isolate overflow-hidden inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-600 shadow-soft transition motion-safe:active:scale-[0.97]"
          >
            {/* FR-35: kilau sekali, panah bergeser saat hover, efek tekan. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 motion-safe:animate-kilau [animation-delay:700ms]" />
            {t('daftarSekarang')}
            <span aria-hidden className="transition-transform duration-200 ease-gerak motion-safe:group-hover:translate-x-1">→</span>
          </a>
        </div>

        <button
          type="button"
          aria-label={t('bukaMenu')}
          aria-expanded={open}
          className="lg:hidden rounded-full p-2 text-brand-700 hover:bg-brand-50"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {/* FR-37: menu mobile buka/tutup lewat grid-template-rows 0fr->1fr, bukan max-height;
          inert saat tertutup agar tautannya tidak bisa difokus. */}
      <div
        inert={!open}
        className={cn(
          'lg:hidden grid border-t border-brand-50 transition-[grid-template-rows] duration-300 ease-gerak motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="container mx-auto py-3 flex flex-col gap-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                >
                  {t(l.key)}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex items-center gap-3 px-1">
              <LanguageSwitcher />
              <a
                href={urlDaftar}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 block rounded-full bg-accent px-5 py-3 text-center text-sm font-semibold text-ink transition-transform motion-safe:active:scale-[0.97]"
              >
                {t('daftarSekarang')}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
