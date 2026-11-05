import { getTranslations } from 'next-intl/server';
import type { DataBiaya } from '@/lib/dataBiaya';

// Tabel HTML biaya per prodi/jalur/kelas/gelombang untuk crawler dan pembaca (FR-SEO-09).
// Server component: baris dirender di HTML awal. Mengembalikan null bila tidak ada biaya (D-04).

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default async function TabelBiaya({ data }: { data: DataBiaya }) {
  if (data.records.length === 0) return null;
  const t = await getTranslations('biayaPage');
  const { records, prodiMap, kelasMap, jadwalMap } = data;

  const namaProdi = (id: string) => {
    const p = prodiMap[id];
    return p ? `${p.jenjang} ${p.nama}`.trim() : '';
  };
  const namaKelas = (id: string | null) => (id ? (kelasMap[id]?.nama ?? '') : '');
  const baris = [...records].sort(
    (a, b) =>
      namaProdi(a.prodi_id).localeCompare(namaProdi(b.prodi_id), 'id') ||
      a.jalur_nama.localeCompare(b.jalur_nama, 'id') ||
      namaKelas(a.kelas_id).localeCompare(namaKelas(b.kelas_id), 'id') ||
      (jadwalMap[a.jadwal_id]?.ke ?? 0) - (jadwalMap[b.jadwal_id]?.ke ?? 0),
  );

  return (
    <div className="overflow-x-auto rounded-3xl border border-brand-100 bg-white shadow-soft">
      <table className="min-w-full text-left text-sm">
        <caption className="px-5 pt-5 pb-3 text-left font-display text-lg font-bold text-ink">
          {t('tabelJudul')}
        </caption>
        <thead className="bg-brand-50 text-xs uppercase tracking-wide text-brand-700">
          <tr>
            <th scope="col" className="px-5 py-3">{t('kolomProdi')}</th>
            <th scope="col" className="px-5 py-3">{t('kolomJalur')}</th>
            <th scope="col" className="px-5 py-3">{t('kolomKelas')}</th>
            <th scope="col" className="px-5 py-3">{t('kolomGelombang')}</th>
            <th scope="col" className="px-5 py-3 text-right">{t('kolomPokok')}</th>
            <th scope="col" className="px-5 py-3 text-right">{t('kolomSemester')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
          {baris.map((r) => (
            <tr key={r._id}>
              <th scope="row" className="px-5 py-3 font-semibold text-ink">{namaProdi(r.prodi_id)}</th>
              <td className="px-5 py-3 text-ink-muted">{r.jalur_nama}</td>
              <td className="px-5 py-3 text-ink-muted">{namaKelas(r.kelas_id) || '—'}</td>
              <td className="px-5 py-3 text-ink-muted">{jadwalMap[r.jadwal_id]?.judul ?? '—'}</td>
              <td className="px-5 py-3 text-right tabular-nums text-ink">{rupiah.format(r.biaya)}</td>
              <td className="px-5 py-3 text-right tabular-nums text-ink-muted">
                {r.biayaPerSemester != null ? rupiah.format(r.biayaPerSemester) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
