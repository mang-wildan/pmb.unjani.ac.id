import { getTranslations } from 'next-intl/server';
import HeroSlider from './HeroSlider';
import HeroGelombangInfo from './HeroGelombangInfo';
import TrackedRegistrationLink from './TrackedRegistrationLink';

type GelombangInfo = { _id: string; ke: number; judul: string; jalur: { nama: string }[]; selesai: string };

export default async function Hero({ urlPendaftaran, judul, subJudul, tahunAjaran, heroImages = [], gelombang = [], jumlahFakultas = 0, jumlahProgramStudi = 0 }: {
  urlPendaftaran: string; judul?: string; subJudul?: string; tahunAjaran?: string;
  heroImages?: string[]; gelombang?: GelombangInfo[]; jumlahFakultas?: number; jumlahProgramStudi?: number;
}) {
  const t = await getTranslations('hero');
  return (
    <section id="hero" data-public-hero className="relative isolate flex flex-col justify-end bg-brand-900 text-white md:min-h-[900px]" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-20"><HeroSlider images={heroImages} judul={judul || t('judul')} fullBleed /></div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/30" aria-hidden />
      <div className="container mx-auto grid gap-10 pt-24 pb-16 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-end md:pb-20">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-lg border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest">{t('badge', { tahun: tahunAjaran || '' })}</span>
          <h1 id="hero-title" className="mt-6 font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl xl:text-7xl">{judul || t('judul')}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">{subJudul || t('subJudul')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedRegistrationLink href={urlPendaftaran} location="hero" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-accent-800 px-7 py-3 font-semibold text-white transition-colors hover:bg-accent-900 motion-reduce:transition-none focus-visible:ring-4 focus-visible:ring-white">{t('daftarSekarang')}</TrackedRegistrationLink>
            <a href="#kalkulator" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white px-7 py-3 font-semibold hover:bg-white/10 focus-visible:ring-4 focus-visible:ring-white">{t('hitungBiaya')}</a>
          </div>
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
            {[[t('nilaiAkreditasi'), t('akreditasi')], [jumlahFakultas, t('fakultas')], [jumlahProgramStudi, t('alumni')]].map(([value, label]) => <div key={label}><dt className="text-xs text-white/80">{label}</dt><dd className="mt-2 font-display text-2xl font-bold md:text-3xl">{value}</dd></div>)}
          </dl>
        </div>
        <div className="w-full max-w-md md:justify-self-end"><HeroGelombangInfo gelombang={gelombang} /></div>
      </div>
    </section>
  );
}
