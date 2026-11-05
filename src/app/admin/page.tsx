import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { redirect } from 'next/navigation';
import { connectDb } from '@/lib/db';
import { getActiveSession } from '@/lib/session';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { Jadwal } from '@/models/Jadwal';
import { Dokumen } from '@/models/Dokumen';
import { Pengumuman } from '@/models/Pengumuman';
import { ProgramStudi } from '@/models/ProgramStudi';
import { Biaya } from '@/models/Biaya';
import { FAQ } from '@/models/FAQ';
import { Popup } from '@/models/Popup';
import { Fakultas } from '@/models/Fakultas';
import { Kelas } from '@/models/Kelas';
import { Icon, KpiCard, ProgressRow, QuickAction } from './_dashboard/komponen';
import { DaftarNotifikasi, StripNotifikasi } from './_dashboard/Notifikasi';
import { ambilDataWidget } from './_dashboard/data';
import { WidgetAktivitas, WidgetArtikel, WidgetBiaya, WidgetJadwal, WidgetPengumuman, WidgetPopup } from './_dashboard/Widgets';
import { hitungNotifikasi, ringkasNotifikasi } from '@/lib/notifikasi';
import { canAccessPage } from '@/lib/permissions';

dayjs.locale('id');

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string }>;
}) {
  const { forbidden } = await searchParams;

  // Halaman ini membaca database langsung (termasuk AuditLog): wajib sesi aktif, tidak cukup
  // JWT yang diperiksa proxy (sesi dicabut/akun nonaktif masih punya JWT valid hingga 1 jam).
  const session = await getActiveSession();
  if (!session) redirect('/api/auth/sesi-berakhir');

  await connectDb().catch(() => null);
  const now = new Date();

  const [
    jalurTotal,
    jadwalAktif,
    jadwalBerjalan,
    jadwalAkanDatang,
    dokumenAktif,
    dokumenTotal,
    pengumumanAktif,
    pengumumanTotal,
    pengumumanPinned,
    programStudiTotal,
    programStudiTanpaAkreditasi,
    biayaTotal,
    faqAktif,
    faqTotal,
    popupAktif,
    fakultasTotal,
    kelasTotal,
  ] = await Promise.all([
    JalurSeleksi.countDocuments().catch(() => 0),
    Jadwal.countDocuments({ status: true }).catch(() => 0),
    Jadwal.countDocuments({ status: true, mulai: { $lte: now }, selesai: { $gte: now } }).catch(() => 0),
    Jadwal.countDocuments({ status: true, mulai: { $gt: now } }).catch(() => 0),
    Dokumen.countDocuments({ aktif: true }).catch(() => 0),
    Dokumen.countDocuments().catch(() => 0),
    Pengumuman.countDocuments({ aktif: true }).catch(() => 0),
    Pengumuman.countDocuments().catch(() => 0),
    Pengumuman.countDocuments({ aktif: true, pinned: true }).catch(() => 0),
    ProgramStudi.countDocuments().catch(() => 0),
    ProgramStudi.countDocuments({ $or: [{ akreditasi: '' }, { akreditasi: { $exists: false } }] }).catch(() => 0),
    Biaya.countDocuments().catch(() => 0),
    FAQ.countDocuments({ aktif: true }).catch(() => 0),
    FAQ.countDocuments().catch(() => 0),
    Popup.countDocuments({ aktif: true }).catch(() => 0),
    Fakultas.countDocuments().catch(() => 0),
    Kelas.countDocuments().catch(() => 0),
  ]);

  // Notifikasi dihitung dari data (FR-62); menggantikan catatan kesiapan FR-55.
  const notifikasi = await hitungNotifikasi(session.role, now).catch(() => []);
  const ringkasan = ringkasNotifikasi(notifikasi);
  // Widget data terbaru dan aktif (FR-65), hanya untuk modul yang boleh dibuka peran ini (FR-67).
  const data = await ambilDataWidget(session.role, now);

  const contentTotal = dokumenAktif + pengumumanAktif + faqAktif + popupAktif;
  const masterDataTotal = fakultasTotal + programStudiTotal + kelasTotal + jalurTotal;
  const bolehJadwal = canAccessPage('/admin/jadwal', session.role);
  const bolehBiaya = canAccessPage('/admin/biaya', session.role);
  const bolehProdi = canAccessPage('/admin/program-studi', session.role);
  // Aksi Cepat hanya memuat halaman yang boleh dibuka peran ini; editor tidak diarahkan ke halaman terlarang.
  const aksiCepat = [
    { href: '/admin/program-studi', label: 'Lengkapi Program Studi', description: 'Periksa prodi, akreditasi, dan relasi fakultas.' },
    { href: '/admin/biaya', label: 'Kelola Biaya Pendidikan', description: 'Atur biaya per jalur, gelombang, dan kelas.' },
    { href: '/admin/dokumen', label: 'Publikasikan Dokumen', description: 'Unggah biaya pendidikan, manual book, atau dokumen lain.' },
    { href: '/admin/log-aktivitas', label: 'Pantau Log Aktivitas', description: 'Lihat audit aktivitas admin dan ringkasan laporan periodik.' },
    { href: '/admin/popup', label: 'Atur Popup Landing', description: `${popupAktif} popup aktif saat ini.` },
  ].filter((a) => canAccessPage(a.href, session.role));

  return (
    <div className="space-y-7">
      {forbidden === '1' && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <Icon name="warning" className="h-5 w-5 flex-shrink-0" />
          <p><span className="font-semibold">Akses ditolak.</span> Anda tidak memiliki izin untuk mengakses halaman tersebut.</p>
        </div>
      )}

      <header className="overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-7">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              <Icon name="activity" className="h-3.5 w-3.5" />
              {dayjs(now).format('dddd, DD MMMM YYYY')}
            </div>
            <h1 className="font-display text-3xl font-extrabold text-ink md:text-4xl">Dashboard PMB</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Ringkasan operasional untuk memantau jadwal pendaftaran, kesiapan master data, konten publik, dan aktivitas admin terbaru.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {bolehJadwal && (
              <Link
                href="/admin/jadwal"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/25 transition-colors duration-200 hover:bg-brand-600"
              >
                <Icon name="calendar" className="h-4 w-4" />
                Kelola Jadwal
              </Link>
            )}
            <Link
              href="/admin/pengumuman"
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2.5 text-sm font-semibold text-brand-700 transition-colors duration-200 hover:bg-brand-50"
            >
              <Icon name="megaphone" className="h-4 w-4" />
              Pengumuman
            </Link>
          </div>
        </div>
        <div className="grid border-t border-brand-100 bg-brand-50/40 px-6 py-4 text-sm md:grid-cols-3 md:px-7">
          <p className="py-1 text-ink-muted"><span className="font-bold text-ink">{jadwalBerjalan}</span> jadwal sedang berjalan</p>
          <p className="py-1 text-ink-muted"><span className="font-bold text-ink">{jadwalAkanDatang}</span> jadwal akan datang</p>
          <p className="py-1 text-ink-muted"><span className="font-bold text-ink">{notifikasi.length}</span> notifikasi</p>
        </div>
      </header>

      <StripNotifikasi ringkasan={ringkasan} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {bolehJadwal && (
          <KpiCard label="Jadwal Aktif" value={jadwalAktif} detail={`${jadwalBerjalan} berjalan, ${jadwalAkanDatang} akan dibuka`} icon="calendar" />
        )}
        {bolehProdi && (
          <KpiCard label="Program Studi" value={programStudiTotal} detail={`${programStudiTanpaAkreditasi} belum ada akreditasi`} icon="book" tone="sky" />
        )}
        {bolehBiaya && (
          <KpiCard label="Data Biaya" value={biayaTotal} detail="Kombinasi prodi, jalur, jadwal, dan kelas" icon="chart" tone="amber" />
        )}
        <KpiCard label="Konten Tayang" value={contentTotal} detail={`${pengumumanPinned} pengumuman dipin`} icon="megaphone" tone="slate" />
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        {data.jadwal && <WidgetJadwal data={data.jadwal} acuan={now} />}
        {data.biaya && <WidgetBiaya data={data.biaya} />}
        <WidgetPengumuman data={data.pengumuman} />
        <WidgetArtikel data={data.artikel} />
        <WidgetPopup data={data.popup} acuan={now} />
        {data.aktivitas && <WidgetAktivitas data={data.aktivitas} />}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section id="notifikasi" className="scroll-mt-24 rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Notifikasi</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Hal yang perlu diperhatikan dan status konten yang tampil ke publik.</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Icon name="check" className="h-5 w-5" />
            </span>
          </div>
          <div className="space-y-4">
            <ProgressRow label="Dokumen aktif" value={dokumenAktif} total={Math.max(dokumenTotal, dokumenAktif)} />
            <ProgressRow label="Pengumuman aktif" value={pengumumanAktif} total={Math.max(pengumumanTotal, pengumumanAktif)} />
            <ProgressRow label="FAQ aktif" value={faqAktif} total={Math.max(faqTotal, faqAktif)} />
          </div>
          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Master data</p>
            <p className="mt-1 text-sm text-ink-muted">
              {masterDataTotal} data dasar tersedia dari fakultas, prodi, kelas, dan jalur seleksi.
            </p>
          </div>
          <div className="mt-4">
            <DaftarNotifikasi butir={notifikasi} />
          </div>
        </section>

        <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-soft">
          <h2 className="font-display text-xl font-bold text-ink">Aksi Cepat</h2>
          <div className="mt-4 grid gap-3">
            {aksiCepat.map((a) => (
              <QuickAction key={a.href} href={a.href} label={a.label} description={a.description} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
