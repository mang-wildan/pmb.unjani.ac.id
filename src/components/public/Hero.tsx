import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import HeroSlider from './HeroSlider';
import HeroGelombangInfo from './HeroGelombangInfo';
import TrackedRegistrationLink from './TrackedRegistrationLink';

// FR-34: elemen pendukung hero masuk bertahap (400ms, jeda 0/60/120/180ms, total <=600ms).
// Judul (h1) dan kartu gambar tidak dianimasikan agar LCP tidak tertunda. Kelas animate-fade-up
// (tanpa motion-safe) sengaja dipakai: saat reduced motion, globals.css menggantinya fade 200ms.
const MASUK = 'animate-fade-up [animation-duration:400ms]';

type GelombangInfo = {
  ke: number;
  judul: string;
  jalur: { nama: string }[];
  selesai: string;
};

export default async function Hero({
  urlPendaftaran,
  judul,
  subJudul,
  tahunAjaran,
  heroImages = [],
  gelombang = [],
  jumlahFakultas = 0,
  jumlahProgramStudi = 0,
}: {
  urlPendaftaran: string;
  judul?: string;
  subJudul?: string;
  tahunAjaran?: string;
  heroImages?: string[];
  gelombang?: GelombangInfo[];
  jumlahFakultas?: number;
  jumlahProgramStudi?: number;
}) {
  const t = await getTranslations('hero');

  return (
    <section id="hero" className="relative overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-accent-50/40" aria-hidden />
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      {/* Blob dekoratif: tidak dirender di HP dan hanya bergerak bila gerak diizinkan (FR-37). */}
      <div className="absolute -top-20 -left-20 hidden h-72 w-72 rounded-full bg-brand/20 blur-3xl md:block motion-safe:animate-blob-drift" aria-hidden />
      <div
        className="absolute -bottom-24 -right-16 hidden h-80 w-80 rounded-full bg-accent/25 blur-3xl md:block motion-safe:animate-blob-drift"
        style={{ animationDelay: '2s' }}
        aria-hidden
      />
      <div className="relative container mx-auto pt-8 pb-14 md:pt-10 md:pb-20 grid gap-10 md:grid-cols-2 items-center">
        <div>
          <span className={`${MASUK} inline-flex items-center gap-2 rounded-full bg-white border border-brand-200 px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-soft`}>
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            {t('badge', { tahun: tahunAjaran || '2026/2027' })}
          </span>
          <h1
            id="hero-title"
            className="mt-5 font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.05] text-ink"
          >
            {judul || t('judul')}
          </h1>
          <p className={`${MASUK} mt-5 text-lg text-ink-muted max-w-xl leading-relaxed`} style={{ animationDelay: '60ms' }}>
            {subJudul || t('subJudul')}
          </p>
          <div className={`${MASUK} mt-8 flex flex-col sm:flex-row gap-3`} style={{ animationDelay: '120ms' }}>
            <TrackedRegistrationLink
              href={urlPendaftaran}
              location="hero"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative isolate overflow-hidden inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-white hover:bg-brand-600 shadow-soft transition motion-safe:active:scale-[0.97]"
            >
              {/* FR-35: kilau sekali, panah bergeser saat hover, efek tekan. */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 motion-safe:animate-kilau [animation-delay:700ms]" />
              {t('daftarSekarang')}
              <span aria-hidden className="transition-transform duration-200 ease-gerak motion-safe:group-hover:translate-x-1">→</span>
            </TrackedRegistrationLink>
            <Link
              href="/#kalkulator"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-ink hover:bg-accent-600 transition"
            >
              {t('hitungBiaya')}
            </Link>
          </div>
          <dl className={`${MASUK} mt-10 grid grid-cols-3 gap-4 max-w-md`} style={{ animationDelay: '180ms' }}>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('akreditasi')}</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-brand-700">{t('nilaiAkreditasi')}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('fakultas')}</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-brand-700">
                {jumlahFakultas}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{t('alumni')}</dt>
              <dd className="mt-1 font-display text-2xl font-bold text-brand-700">
                {jumlahProgramStudi}
              </dd>
            </div>
          </dl>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 bg-gradient-to-tr from-brand-200 via-accent-200 to-transparent blur-3xl opacity-60" aria-hidden />
          <div className="relative rounded-3xl bg-white shadow-soft border border-brand-50 overflow-hidden">
            <HeroSlider images={heroImages} judul={judul || t('judul')} />
            {/* FR-41: di bawah md kartu status berada di bawah gambar (statis), bukan menimpa gambar
                dan titik navigasi; mulai md kembali melayang di kiri bawah gambar. */}
            <div className="p-3 md:absolute md:bottom-4 md:left-4 md:max-w-[260px] md:p-0">
              <HeroGelombangInfo gelombang={gelombang} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
