import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { connectDb } from '@/lib/db';
import { getSettings } from '@/models/Settings';
import { PageContent } from '@/models/PageContent';
import { FAQ } from '@/models/FAQ';
import FAQAccordion, { type FAQItem } from '@/components/public/FAQAccordion';
import {
  buildMetadata,
  breadcrumbJsonLd,
  type PublicLocale,
} from '@/lib/seo';
import JsonLd from '@/components/public/JsonLd';

// Fallback aset kampus, sama dengan HeroSlider (bukan path upload CMS).
const FOTO_KAMPUS_BAWAAN = '/pmb unjani.jpg';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'kontakPage' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDesc'),
    path: '/kontak',
    locale,
  });
}

export default async function KontakPage({ params }: { params: Promise<{ locale: PublicLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations('kontakPage');
  const tc = await getTranslations('common');

  await connectDb().catch(() => null);
  const [s, hero, faq] = await Promise.all([
    getSettings().catch(() => null),
    PageContent.findOne({ kunci: 'hero' }).select('data').lean().catch(() => null),
    FAQ.find({ aktif: true }).sort({ urutan: 1 }).limit(3).lean().catch(() => []),
  ]);

  const heroImages = ((hero?.data || {}) as { heroImages?: string[] }).heroImages || [];
  const fotoHero = heroImages[0] || FOTO_KAMPUS_BAWAAN;
  const fotoKampus = heroImages[1] || fotoHero;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s?.alamat || '')}`;

  const faqItems: FAQItem[] = (faq as any[]).map((item) => ({
    _id: String(item._id),
    pertanyaan: locale === 'en' ? item.pertanyaan_en || item.pertanyaan : item.pertanyaan,
    jawaban: locale === 'en' ? item.jawaban_en || item.jawaban : item.jawaban,
    kategori: item.kategori,
    urutan: item.urutan,
  }));

  return (
    <div className="bg-[#F2F5F0] text-ink">
      <section
        data-public-hero
        aria-labelledby="kontak-title"
        className="relative isolate flex min-h-[440px] flex-col justify-end overflow-hidden bg-[#06281D] text-white md:min-h-[480px]"
      >
        <Image
          src={fotoHero}
          alt=""
          fill
          preload
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-[#06281D] via-[#06281D]/60 to-[#06281D]/30" aria-hidden />
        <div className="container mx-auto pb-14 pt-24 md:pb-20">
          <nav aria-label={t('breadcrumbLabel')} className="text-xs text-white/80">
            <Link href="/" className="rounded-lg hover:underline">{tc('beranda')}</Link>
            <span aria-hidden> / </span>
            <span aria-current="page">{t('breadcrumb')}</span>
          </nav>
          <p className="mt-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            <span aria-hidden className="h-0.5 w-6 bg-[#D4AF37]" />
            {t('eyebrow')}
          </p>
          <h1 id="kontak-title" className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/85 md:text-lg">{t('desc')}</p>
        </div>
      </section>

      <section className="container mx-auto py-14 md:py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <article className="rounded-lg bg-white p-6 shadow-sm md:p-8">
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">{t('sekretariatTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{t('sekretariatDesc')}</p>
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-lg bg-[#E3ECE3]">
              <Image src={fotoKampus} alt={t('heroImageAlt')} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
            </div>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-semibold text-ink">{t('kampusLabel')}</p>
                {s?.alamat && <p className="mt-1 max-w-md text-sm text-ink-muted">{s.alamat}</p>}
              </div>
              {s?.alamat && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#063F2A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#06281D] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37] motion-reduce:transition-none"
                >
                  {t('bukaMaps')} <span aria-hidden>→</span>
                </a>
              )}
            </div>
          </article>

          <aside className="rounded-lg bg-[#063F2A] p-6 text-white md:p-8">
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t('kanalTitle')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{t('kanalDesc')}</p>
            <dl className="mt-6 divide-y divide-white/15">
              {s?.email && (
                <div className="pb-5">
                  <dt className="text-xs text-white/70">{t('emailLabel')}</dt>
                  <dd className="mt-1">
                    <a href={`mailto:${s.email}`} className="font-semibold text-[#D4AF37] hover:underline">
                      {s.email}
                    </a>
                  </dd>
                </div>
              )}
              {s?.telepon && (
                <div className="py-5">
                  <dt className="text-xs text-white/70">{t('teleponLabel')}</dt>
                  <dd className="mt-1">
                    <a href={`tel:${s.telepon.replace(/[^\d+]/g, '')}`} className="font-semibold text-white hover:underline">
                      {s.telepon}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {s?.whatsapp && (
              <a
                href={`https://wa.me/${s.whatsapp.replace(/\D/g, '').replace(/^0/, '62')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#1D2114] transition-colors hover:bg-[#C4A030] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white motion-reduce:transition-none"
              >
                {t('whatsappCta')} <span aria-hidden>→</span>
              </a>
            )}
            {s?.sosmed && s.sosmed.length > 0 && (
              <div className="mt-6 border-t border-white/15 pt-5">
                <p className="text-xs text-white/70">{t('sosmedLabel')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.sosmed.map((m, i) => (
                    <a
                      key={i}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                    >
                      {m.nama}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {faqItems.length > 0 && (
        <section className="bg-[#E3ECE3] py-14 md:py-20" aria-labelledby="faq-kontak-heading">
          <div className="container mx-auto grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <h2 id="faq-kontak-heading" className="font-display text-3xl font-extrabold leading-tight text-ink md:text-4xl">
                {t('faqTitle')}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-muted">{t('faqDesc')}</p>
              <Link href="/faq" className="mt-5 inline-flex items-center gap-2 rounded-lg font-semibold text-[#063F2A] hover:underline">
                {t('faqLink')} <span aria-hidden>→</span>
              </Link>
            </div>
            <FAQAccordion items={faqItems} tampilkanTab={false} />
          </div>
        </section>
      )}

      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: tc('beranda'), path: '/' },
            { name: t('breadcrumb'), path: '/kontak' },
          ]),
        ]}
      />
    </div>
  );
}
