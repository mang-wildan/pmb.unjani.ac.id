import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { connectDb } from '@/lib/db';
import { getSettings } from '@/models/Settings';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { Jadwal } from '@/models/Jadwal';
import { Dokumen } from '@/models/Dokumen';
import { Pengumuman } from '@/models/Pengumuman';
import { Artikel, filterArtikelLayakTampilPublik } from '@/models/Artikel';
import '@/models/AdminUser';
import { PageContent } from '@/models/PageContent';
import { FAQ } from '@/models/FAQ';
import { Fakultas } from '@/models/Fakultas';
import '@/models/Jenjang';
import { ProgramStudi } from '@/models/ProgramStudi';
import type { InstagramPostItem } from '@/components/public/InstagramFeed';
import { Popup } from '@/models/Popup';
import ProgramStudiExplorer from '@/components/public/ProgramStudiExplorer';
import Hero from '@/components/public/Hero';
import JalurList from '@/components/public/JalurList';
import JadwalHighlights from '@/components/public/JadwalHighlights';
import DokumenList from '@/components/public/DokumenList';
import PengumumanList from '@/components/public/PengumumanList';
import ArtikelSection from '@/components/public/ArtikelSection';
import FAQAccordion from '@/components/public/FAQAccordion';
import InstagramFeed from '@/components/public/InstagramFeed';
import LandingPopup from '@/components/public/LandingPopup';
import Reveal from '@/components/public/Reveal';
import { SectionHeading } from '@/components/ui/Card';
import JsonLd from '@/components/public/JsonLd';
import { buildMetadata, breadcrumbJsonLd, type PublicLocale } from '@/lib/seo';
import KalkulatorForm from '@/components/public/KalkulatorForm';
import { muatDataBiaya, muatKalkulatorKosong } from '@/lib/dataBiaya';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: PublicLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const hero = await connectDb()
    .then(() => PageContent.findOne({ kunci: 'hero' }).select('data').lean())
    .catch(() => null);
  const tahun = String((hero?.data as { tahunAjaran?: string } | undefined)?.tahunAjaran ?? '').trim();
  const title = `${['PMB UNJANI', tahun].filter(Boolean).join(' ')} – ${t('metaTitleSufiks')}`;
  const meta = buildMetadata({ description: t('metaDesc'), path: '/', locale });
  return {
    ...meta,
    title: { absolute: title },
    openGraph: { ...meta.openGraph, title },
    twitter: { ...meta.twitter, title },
  };
}

async function fetchInstagramPosts(instagramAccessToken?: string): Promise<InstagramPostItem[]> {
  const token = instagramAccessToken?.trim() || process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_url,thumbnail_url,permalink,media_type&limit=4&access_token=${token}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('home');
  const td = await getTranslations('dokumen');

  await connectDb().catch(() => null);

  const now = new Date();
  const activeScheduleStart = new Date(now);
  activeScheduleStart.setHours(0, 0, 0, 0);
  const activeScheduleEnd = new Date(now);
  activeScheduleEnd.setHours(23, 59, 59, 999);
  const settingsPromise = getSettings().catch(() => null);
  const [
    settings,
    jalur,
    activeJadwal,
    upcomingJadwal,
    biayaDocs,
    manualDocs,
    pengumuman,
    artikel,
    hero,
    faqItems,
    instagramPosts,
    popups,
    jumlahFakultas,
    jumlahProgramStudi,
    dataBiaya,
    fakultasList,
    prodiList,
  ] =
    await Promise.all([
      settingsPromise,
      JalurSeleksi.find({ aktif: true }).sort({ urutan: 1, nama: 1 }).lean(),
      Jadwal.find({
        status: true,
        mulai: { $lte: activeScheduleEnd },
        selesai: { $gte: activeScheduleStart },
      })
        .populate('jalur', 'nama')
        .sort({ mulai: 1 })
        .limit(6)
        .lean(),
      Jadwal.findOne({
        status: true,
        mulai: { $gt: activeScheduleEnd },
      })
        .populate('jalur', 'nama')
        .sort({ mulai: 1 })
        .lean()
        .catch(() => null),
      // G-1: panel menampilkan semua dokumen aktif (tanpa batas dan tanpa tautan "Lihat semua").
      Dokumen.find({ kategori: 'biaya', aktif: true })
        .sort({ urutan: 1, updatedAt: -1 })
        .lean(),
      Dokumen.find({ kategori: 'manual-book', aktif: true })
        .sort({ urutan: 1, updatedAt: -1 })
        .lean(),
      Pengumuman.find({ aktif: true }).sort({ pinned: -1, publishedAt: -1 }).limit(3).lean(),
      Artikel.find(filterArtikelLayakTampilPublik(now))
        .select('slug judul judul_en isi isi_en coverImage publishedAt createdBy')
        .populate('createdBy', 'nama -_id')
        .sort({ pinned: -1, publishedAt: -1 })
        .limit(3)
        .lean()
        .catch((error) => {
          console.error('[landing] Gagal memuat artikel', error);
          return [];
        }),
      PageContent.findOne({ kunci: 'hero' }).lean(),
      FAQ.find({ aktif: true }).sort({ kategori: 1, urutan: 1 }).lean().catch(() => []),
      settingsPromise.then((item) =>
        item?.instagramFeedAktif !== false
          ? fetchInstagramPosts(item?.instagramAccessToken)
          : [],
      ),
      Popup.find({
        aktif: true,
        $and: [
          { $or: [{ tampilDari: null }, { tampilDari: { $lte: now } }] },
          { $or: [{ tampilSampai: null }, { tampilSampai: { $gte: now } }] },
        ],
      })
        .sort({ urutan: 1, createdAt: -1 })
        .limit(3)
        .lean()
        .catch(() => []),
      Fakultas.countDocuments().catch(() => 0),
      ProgramStudi.countDocuments().catch(() => 0),
      // FR-53 dan transformasinya ada di muatDataBiaya (src/lib/dataBiaya.ts).
      muatDataBiaya(now),
      Fakultas.find().sort({ nama: 1 }).lean().catch(() => []),
      ProgramStudi.find()
        .populate('jenjang_id', 'nama singkatan warna')
        .populate('fakultas_id', 'nama singkatan warna')
        .sort({ nama: 1 })
        .lean()
        .catch(() => []),
    ]);
  const jadwal = [
    ...(activeJadwal as any[]),
    ...(upcomingJadwal ? [{ ...(upcomingJadwal as any), isSoon: true }] : []),
  ];

  const { records: kalkulatorRecords, prodiOptions, prodiMap, kelasMap, jadwalMap } = dataBiaya;

  const heroData = (hero?.data || {}) as {
    judul?: string;
    subJudul?: string;
    tahunAjaran?: string;
    heroImages?: string[];
  };
  const urlDaftar = settings?.urlPendaftaran || 'https://pendaftaran.unjani.ac.id/loginnew';

  const kalkulatorKosong = await muatKalkulatorKosong(locale);

  const activeGelombangList = (activeJadwal as any[]);

  const localizedFaq = (faqItems as any[]).map((item) => ({
    _id: String(item._id),
    pertanyaan: locale === 'en' ? (item.pertanyaan_en || item.pertanyaan) : item.pertanyaan,
    jawaban: locale === 'en' ? (item.jawaban_en || item.jawaban) : item.jawaban,
    kategori: item.kategori,
    urutan: item.urutan,
  }));

  const fakultasSectionItems = (fakultasList as any[]).map((item) => ({
    _id: String(item._id),
    nama: String(item.nama || ''),
    singkatan: String(item.singkatan || ''),
    warna: item.warna ? String(item.warna) : undefined,
  }));

  // FR-46: tombol "Hitung biaya" hanya untuk prodi yang punya biaya. Diturunkan dari
  // kalkulatorRecords, yaitu set biaya yang sudah disaring jadwal aktif (FR-53, T-72), bukan dari
  // koleksi Biaya mentah, sehingga prodi yang hanya punya biaya tahun lalu tidak mendapat tombol.
  const prodiBerbiaya = new Set(kalkulatorRecords.map((r) => r.prodi_id));

  const fakultasProgramStudiItems = (prodiList as any[]).map((item) => ({
    _id: String(item._id),
    nama: String(item.nama || ''),
    singkatan: String(item.singkatan || ''),
    jenjang: String((item.jenjang_id as any)?.singkatan || ''),
    jenjangWarna: (item.jenjang_id as any)?.warna ? String((item.jenjang_id as any).warna) : undefined,
    akreditasi: item.akreditasi ? String(item.akreditasi) : '',
    persyaratan: Array.isArray(item.persyaratan) ? (item.persyaratan as string[]) : [],
    punyaBiaya: prodiBerbiaya.has(String(item._id)),
    // FR-57: tautan unduh sertifikat hanya bila berkas akreditasi ada.
    hasAkreditasiFile: !!item.fileAkreditasi?.filename,
    fakultas_id: {
      _id: String(item.fakultas_id?._id || ''),
      nama: String(item.fakultas_id?.nama || ''),
      singkatan: String(item.fakultas_id?.singkatan || ''),
    },
  }));

  return (
    <>
      <Hero
        urlPendaftaran={urlDaftar}
        judul={heroData.judul}
        subJudul={heroData.subJudul}
        tahunAjaran={heroData.tahunAjaran}
        heroImages={heroData.heroImages || []}
        jumlahFakultas={jumlahFakultas}
        jumlahProgramStudi={jumlahProgramStudi}
        gelombang={activeGelombangList.map((g: any) => ({
          ke: g.ke,
          judul: g.judul,
          jalur: (g.jalur as any[]) || [],
          selesai: g.selesai instanceof Date ? g.selesai.toISOString() : String(g.selesai),
        }))}
      />

      <section className="container mx-auto py-16" aria-labelledby="dok-heading">
        <Reveal>
          <SectionHeading
            eyebrow={t('dokumenEyebrow')}
            title={t('dokumenTitle')}
            description={t('dokumenDesc')}
          />
        </Reveal>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* ── Panel: Biaya Pendidikan (teks putih di atas brand-700/800, kontras AA) ── */}
          <Reveal urutan={1}>
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
              <div className="bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-6 text-white">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-white/20" aria-hidden="true">
                    <i className="fa-duotone fa-solid fa-file-invoice-dollar text-[1.75rem] leading-none" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-bold leading-snug">{t('dokumenBiaya')}</h3>
                    <p className="mt-0.5 text-sm">{td('biayaSubjudul')}</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink/30 px-3 py-1 text-xs font-semibold">
                  <i className="fa-solid fa-check text-[0.65rem]" aria-hidden="true" />
                  {td('biayaBadge')}
                </span>
              </div>
              <div className="flex-1 p-5">
                <DokumenList items={biayaDocs as any} locale={locale} iconType="biaya" />
              </div>
              <p className="border-t border-brand-100 px-5 py-3 text-sm text-ink-muted">
                {td.rich('bantuKalkulator', {
                  link: (teks) => (
                    <a href="#kalkulator" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                      {teks}
                    </a>
                  ),
                })}
              </p>
            </div>
          </Reveal>

          {/* ── Panel: Buku Panduan (header kuning, teks ink gelap, kontras AA) ── */}
          <Reveal urutan={2}>
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-accent-100 bg-white shadow-soft">
              <div className="bg-gradient-to-br from-accent to-accent-300 px-6 py-6 text-ink">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-ink/10" aria-hidden="true">
                    <i className="fa-sharp-duotone fa-solid fa-book text-[1.75rem] leading-none" />
                  </span>
                  <div>
                    <h3 id="manual-book" className="scroll-mt-24 font-display text-xl font-bold leading-snug">
                      {t('dokumenManual')}
                    </h3>
                    <p className="mt-0.5 text-sm">{td('manualSubjudul')}</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold">
                  <i className="fa-solid fa-check text-[0.65rem]" aria-hidden="true" />
                  {td('manualBadge')}
                </span>
              </div>
              <div className="flex-1 p-5">
                <DokumenList items={manualDocs as any} locale={locale} iconType="manual" />
              </div>
              <p className="border-t border-accent-100 px-5 py-3 text-sm text-ink-muted">{td('bantuManual')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="jalur" className="bg-brand-50/40 py-16 scroll-mt-24" aria-labelledby="jalur-heading">
        <div className="container mx-auto">
          <Reveal>
            <SectionHeading
              eyebrow={t('jalurEyebrow')}
              title={t('jalurTitle')}
              description={t('jalurDesc')}
            />
          </Reveal>
          {/* Baris jalur masuk bertahap di JalurAccordion (FR-36). */}
          <div className="mt-10">
            <JalurList items={jalur as any} locale={locale} />
          </div>
          <div className="mt-6">
            <Link
              href="/jalur-masuk"
              className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
            >
              {t('jalurLink')}
            </Link>
          </div>
        </div>
      </section>

      <section id="jadwal" className="container mx-auto py-16" aria-labelledby="jadwal-heading">
        <Reveal>
          <SectionHeading
            eyebrow={t('jadwalEyebrow')}
            title={t('jadwalTitle')}
            description={t('jadwalDesc')}
          />
        </Reveal>
        {/* Kartu jadwal masuk bertahap di JadwalHighlights (FR-36). */}
        <div className="mt-10">
          <JadwalHighlights items={jadwal as any} locale={locale} />
        </div>
        <div className="mt-6">
          <Link
            href="/jadwal-pmb"
            className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
          >
            {t('jadwalLink')}
          </Link>
        </div>
      </section>

      <section
        id="kalkulator"
        className="container mx-auto py-16 scroll-mt-24"
        aria-labelledby="kalkulator-heading"
      >
        <Reveal>
          <SectionHeading
            eyebrow={t('kalkulatorEyebrow')}
            title={t('kalkulatorTitle')}
            description={t('kalkulatorDesc')}
          />
        </Reveal>
        <Reveal delayMs={120} className="mt-10">
          <KalkulatorForm
            records={kalkulatorRecords}
            prodiOptions={prodiOptions}
            prodiMap={prodiMap}
            kelasMap={kelasMap}
            jadwalMap={jadwalMap}
            kosong={kalkulatorKosong}
          />
        </Reveal>
        <div className="mt-6">
          <Link
            href="/biaya-kuliah"
            className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
          >
            {t('biayaLink')}
          </Link>
        </div>
      </section>

      {fakultasSectionItems.length > 0 && (
        <ProgramStudiExplorer
          fakultas={fakultasSectionItems}
          programStudi={fakultasProgramStudiItems}
          urlWhatsApp={kalkulatorKosong.urlWhatsApp}
          teks={{
            eyebrow: t('fakultasEyebrow'),
            title: t('fakultasTitle'),
            desc: t('fakultasDesc'),
          }}
        />
      )}

      {pengumuman.length > 0 && (
        <section className="bg-brand-50/40 py-16" aria-labelledby="pengumuman-heading">
          <div className="container mx-auto">
            <SectionHeading
              eyebrow={t('pengumumanEyebrow')}
              title={t('pengumumanTitle')}
              description={t('pengumumanDesc')}
            />
            <div className="mt-10">
              <PengumumanList items={pengumuman as any} locale={locale} />
            </div>
            <div className="mt-6">
              <Link
                href="/pengumuman"
                className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
              >
                {t('pengumumanLink')}
              </Link>
            </div>
          </div>
        </section>
      )}

      <ArtikelSection items={artikel as any} locale={locale} />

      {instagramPosts.length > 0 && (
        <section className="container mx-auto py-16" aria-labelledby="instagram-heading">
          <Reveal>
            <SectionHeading
              eyebrow={t('instagramEyebrow')}
              title={t('instagramTitle')}
              description={t('instagramDesc')}
            />
          </Reveal>
          {/* Kartu Instagram masuk bertahap di InstagramFeed (FR-36). */}
          <div className="mt-10">
            <InstagramFeed posts={instagramPosts as any} />
          </div>
          <div className="mt-8">
            <a
              href="https://www.instagram.com/infopmbunjani"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
            >
              {t('instagramLink')}
            </a>
          </div>
        </section>
      )}

      <section className="bg-brand-50/40 py-16" aria-labelledby="faq-heading">
        <div className="container mx-auto">
          <Reveal>
            <SectionHeading
              eyebrow={t('faqEyebrow')}
              title={t('faqTitle')}
              description={t('faqDesc')}
            />
          </Reveal>
          <Reveal delayMs={120} className="mt-10">
            <FAQAccordion items={localizedFaq} />
          </Reveal>
          <div className="mt-6">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
            >
              {t('faqLink')}
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto py-16">
        {/* CTA penutup: fade biasa tanpa geser/zoom (FR-36). */}
        <Reveal efek="fade">
          <div
            className="rounded-3xl p-10 md:p-14 text-white text-center relative overflow-hidden"
            style={{ backgroundImage: "url('/pmb%20unjani.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-brand/70" aria-hidden />
            <div className="absolute inset-0 bg-grid opacity-10" aria-hidden />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold">{t('ctaTitle')}</h2>
              <p className="mt-3 text-white/90 max-w-2xl mx-auto">{t('ctaDesc')}</p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <a
                  href={urlDaftar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-ink hover:bg-accent-600 shadow-soft"
                >
                  {t('ctaDaftar')}
                </a>
                <a
                  href="https://wa.me/628112497890?text=Yth%20Ibu%20Yani%2C%20mohon%20bantuan%20informasi%20terkait%20Pendaftaran%20di%20Universitas%20Jenderal%20Achmad%20Yani.%20Nama%20Saya%20%3A%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white px-7 py-3.5 text-base font-semibold text-white hover:bg-white hover:text-brand-700 transition"
                >
                  {t('ctaKontak')}
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <LandingPopup
        items={(popups as any[]).map((p) => ({
          _id: String(p._id),
          judul: p.judul,
          alt: p.alt || '',
          url: p.url || '',
          hideForDays: p.hideForDays ?? 1,
          durasiTampil: p.durasiTampil ?? 5,
        }))}
      />

      <JsonLd data={breadcrumbJsonLd([{ name: 'Beranda', path: '/' }])} />
    </>
  );
}
