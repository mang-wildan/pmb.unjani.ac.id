import { getTranslations } from 'next-intl/server';
import { connectDb } from '@/lib/db';
import { getSettings } from '@/models/Settings';
import { SectionHeading, Card } from '@/components/ui/Card';
import {
  buildMetadata,
  breadcrumbJsonLd,
  type PublicLocale,
} from '@/lib/seo';
import JsonLd from '@/components/public/JsonLd';

function SosmedIcon({ nama }: { nama: string }) {
  const value = nama.toLowerCase();

  if (value.includes('instagram')) return 'fa-brands fa-instagram';
  if (value.includes('tiktok')) return 'fa-brands fa-tiktok';
  if (value.includes('youtube')) return 'fa-brands fa-youtube';
  if (value.includes('facebook')) return 'fa-brands fa-facebook-f';
  if (value.includes('twitter') || value === 'x' || value.includes(' x ')) return 'fa-brands fa-x-twitter';

  return 'fa-solid fa-link';
}

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

export default async function KontakPage() {
  const t = await getTranslations('kontakPage');
  const tf = await getTranslations('footer');
  const mapsUrl = 'https://maps.app.goo.gl/7ViYh7x7LLknjYC17';

  await connectDb().catch(() => null);
  const s = await getSettings().catch(() => null);

  return (
    <div className="container mx-auto py-12 md:py-16 max-w-4xl">
      <SectionHeading level={1} eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl font-bold text-ink">Sekretariat PMB</h3>
          <p className="mt-3 text-ink-muted">Gedung Rektorat Lantai 1</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-start gap-3 text-left text-ink-muted transition hover:text-brand-700"
          >
            <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <i className="fa-solid fa-location-dot text-base" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-ink">
                {s?.alamat || 'Jl. Terusan Jenderal Sudirman, Cimahi, Jawa Barat'}
              </span>
              <span className="mt-1 inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                Buka di Maps
              </span>
            </span>
          </a>
        </Card>
        <Card>
          <h3 className="font-display text-xl font-bold text-ink">Kanal Resmi</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {s?.email && (
              <li>
                <span className="text-ink-muted">{tf('email')}</span>{' '}
                <a href={`mailto:${s.email}`} className="font-semibold text-brand-700 hover:underline">
                  {s.email}
                </a>
              </li>
            )}
            {s?.telepon && (
              <li>
                <span className="text-ink-muted">{tf('telepon')}</span>{' '}
                <span className="font-semibold">{s.telepon}</span>
              </li>
            )}
            {s?.whatsapp && (
              <li>
                <span className="text-ink-muted">WhatsApp:</span>{' '}
                <a
                  href={`https://wa.me/${s.whatsapp.replace(/\D/g, '').replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {s.whatsapp}
                </a>
              </li>
            )}
            {s?.sosmed && s.sosmed.length > 0 && (
              <li className="pt-2">
                <span className="text-ink-muted">Sosial Media:</span>
                <div className="mt-3 flex flex-wrap gap-3">
                  {s.sosmed.map((m: { nama: string; url: string }, i: number) => (
                    <a
                      key={i}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={m.nama}
                      title={m.nama}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand hover:text-white"
                    >
                      <i className={`${SosmedIcon({ nama: m.nama })} text-lg`} aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Beranda', path: '/' },
            { name: t('title'), path: '/kontak' },
          ]),
        ]}
      />
    </div>
  );
}
