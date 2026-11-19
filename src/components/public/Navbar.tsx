'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { PublicSettings } from '@/models/Settings';
import LanguageSwitcher from './LanguageSwitcher';

const navLinks = [
  { href: '/#manual-book', key: 'manualBook' },
  { href: '/#jalur-seleksi', key: 'jalurSeleksi' },
  { href: '/#kalkulator', key: 'biaya' },
  { href: '/pengumuman', key: 'pengumuman' },
  { href: '/kontak', key: 'kontak' },
] as const;
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2';
const cta = `inline-flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] text-[#1D2114] hover:bg-[#C4A030] px-5 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none ${focus}`;

export default function Navbar({ settings }: { settings: PublicSettings | null }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(true);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const urlDaftar = settings?.urlPendaftaran || 'https://pendaftaran.unjani.ac.id/loginnew';
  const editorial = pathname.startsWith('/artikel/');
  const heroRoute = pathname === '/' || pathname === '/kontak' || pathname === '/artikel' || pathname === '/pengumuman' || pathname.startsWith('/pengumuman/');
  const anchorHref = (href: string) => `${locale === 'en' ? '/en' : '/'}${href.slice(1)}`;

  useEffect(() => {
    // Kontrak Task 3–6: hero gelap diberi data-public-hero, dimulai di y=0,
    // dan memberi ruang isi minimal 96px di atas. Tanpa marker, navbar tetap terbaca.
    const update = () => {
      const hero = document.querySelector('[data-public-hero]');
      setScrolled(!heroRoute || !hero || hero.getBoundingClientRect().bottom <= 80);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname, heroRoute]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    // Menu disclosure, bukan dialog: Tab tetap mengikuti urutan dokumen.
    const leave = (event: FocusEvent) => {
      if (!menu.current?.contains(event.target as Node) && event.target !== toggle.current) setOpen(false);
    };
    const resize = () => { if (window.matchMedia('(min-width: 1024px)').matches) setOpen(false); };
    document.addEventListener('keydown', escape);
    document.addEventListener('focusin', leave);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('focusin', leave);
      window.removeEventListener('resize', resize);
    };
  }, [open]);

  const solid = scrolled || open;
  const linkClass = `rounded-lg px-3 py-2 text-sm font-medium hover:underline underline-offset-4 ${focus}`;
  return (
    <>
      <header className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-200 motion-reduce:transition-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-[#D4AF37]',
        editorial ? 'bg-[#06281D] text-white' : solid ? 'border-b border-[#CBD9CD] bg-white text-[#10281D]' : 'bg-transparent text-white',
      )}>
        <nav aria-label={t('navigasiUtama')} className="container mx-auto flex h-20 items-center justify-between gap-2">
          <Link href="/" className={`flex shrink-0 items-center gap-2 rounded-lg ${focus}`} aria-label={t('berandaLabel')}>
            <Image src="/logo-pmb-unjani (1).png" alt="Logo PMB UNJANI" width={40} height={40} className="h-10 w-auto object-contain" priority />
            <Image src="/LOGO-AKREDITASI-UNGGUL.png" alt="Akreditasi Unggul" width={40} height={40} className="h-10 w-auto object-contain" priority />
            <span className="hidden xl:block font-display font-bold leading-tight">
              <span className="block text-xs">{t('penerimaanMahasiswaBaru')}</span>
              <span className="block text-lg">UNJANI</span>
            </span>
          </Link>
          <ul className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => <li key={l.href}>
              {l.href.includes('#') ? <a href={anchorHref(l.href)} className={linkClass}>{t(l.key)}</a> : <Link href={l.href} className={linkClass}>{t(l.key)}</Link>}
            </li>)}
          </ul>
          <div className="hidden lg:flex items-center gap-2">
            <LanguageSwitcher />
            <a href={urlDaftar} target="_blank" rel="noopener noreferrer" className={cta}>{t('daftarSekarang')} <span aria-hidden>→</span></a>
          </div>
          <button ref={toggle} type="button" aria-label={t('bukaMenu')} aria-expanded={open} aria-controls="public-mobile-menu" className={`lg:hidden rounded-lg p-2 hover:bg-black/10 ${focus}`} onClick={() => setOpen((v) => !v)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </nav>
        <div ref={menu} id="public-mobile-menu" inert={!open} className={cn('lg:hidden grid bg-white text-[#10281D] transition-[grid-template-rows] duration-200 motion-reduce:transition-none', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="min-h-0 overflow-hidden">
            <ul className="container mx-auto flex max-h-[calc(100dvh-5rem)] flex-col gap-1 overflow-y-auto py-3">
              {navLinks.map((l) => <li key={l.href}>
                {l.href.includes('#') ? <a href={anchorHref(l.href)} onClick={() => setOpen(false)} className={`block ${linkClass}`}>{t(l.key)}</a> : <Link href={l.href} onClick={() => setOpen(false)} className={`block ${linkClass}`}>{t(l.key)}</Link>}
              </li>)}
              <li className="mt-2 flex items-center gap-3 px-1"><LanguageSwitcher /><a href={urlDaftar} target="_blank" rel="noopener noreferrer" className={`flex-1 ${cta}`}>{t('daftarSekarang')}</a></li>
            </ul>
          </div>
        </div>
      </header>
      {/* Tidak ada baris kosong di atas hero; hanya halaman non-hero perlu offset. */}
      <div aria-hidden className={cn('h-20', heroRoute && '[body:has([data-public-hero])_&]:hidden')} />
    </>
  );
}
