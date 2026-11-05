import { getTranslations } from 'next-intl/server';
import { Jadwal } from '@/models/Jadwal';
import { Biaya } from '@/models/Biaya';
import '@/models/Kelas';
import '@/models/Jenjang';
import { batasHari } from '@/lib/statusPeriode';
import { loadSiteSettings } from '@/lib/siteSettings';
import type {
  BiayaRecord,
  JadwalOpt,
  KalkulatorKosong,
  KelasOpt,
  ProdiInfo,
} from '@/components/public/KalkulatorForm';
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';

export type DataBiaya = {
  records: BiayaRecord[];
  prodiOptions: SearchableSelectOption[];
  prodiMap: Record<string, ProdiInfo>;
  kelasMap: Record<string, KelasOpt>;
  jadwalMap: Record<string, JadwalOpt>;
};

/**
 * Data biaya untuk kalkulator dan tabel biaya. Pemanggil harus sudah memanggil connectDb().
 * Gagal memuat: semua kosong dan error dicatat (halaman tetap 200).
 */
export async function muatDataBiaya(acuan: Date = new Date()): Promise<DataBiaya> {
  let rawBiaya: any[] = [];
  try {
    // FR-53: biaya hanya dari jadwal berstatus aktif yang belum berakhir, termasuk yang belum
    // dimulai. "Berakhir" mengikuti halaman Jadwal admin: tanggal selesai sudah lewat; hari ini
    // masih dihitung. Jadwal nonaktif atau yang sudah lewat tidak menyumbang biaya, meskipun
    // datanya tetap ada di menu Biaya admin.
    const jadwalBerlaku = await Jadwal.find({
      status: true,
      selesai: { $gte: batasHari(acuan).awal },
    })
      .select('_id')
      .lean();
    if (jadwalBerlaku.length > 0) {
      rawBiaya = await Biaya.find({ jadwal_id: { $in: jadwalBerlaku.map((j) => j._id) } })
        .populate({
          path: 'programStudi_id',
          select: 'nama singkatan jenjang_id akreditasi fileAkreditasi fakultas_id',
          populate: [
            { path: 'fakultas_id', select: 'nama' },
            { path: 'jenjang_id', select: 'nama singkatan' },
          ],
        })
        .populate('jalur_id', 'nama')
        .populate('jadwal_id', 'judul tahun ke')
        .populate('kelas_id', 'nama singkatan')
        .lean();
    }
  } catch (error) {
    console.error('[landing] Failed to load biaya records', error);
    rawBiaya = [];
  }

  const records: BiayaRecord[] = rawBiaya
    .filter((b) => b.programStudi_id && b.jalur_id && b.jadwal_id)
    .map((b) => ({
      _id: String(b._id),
      prodi_id: String(b.programStudi_id._id),
      jalur_id: String(b.jalur_id._id),
      jalur_nama: String(b.jalur_id.nama),
      kelas_id: b.kelas_id ? String(b.kelas_id._id) : null,
      jadwal_id: String(b.jadwal_id._id),
      biaya: Number(b.biaya),
      biayaPerSemester: b.biayaPerSemester != null ? Number(b.biayaPerSemester) : null,
      biayaTambahan: b.biayaTambahan != null ? Number(b.biayaTambahan) : null,
      persentase:
        Array.isArray(b.persentase) && b.persentase.length > 0
          ? (b.persentase as string[])
          : ['100%'],
    }));

  const prodiSeen = new Set<string>();
  const prodiOptions: SearchableSelectOption[] = [];
  for (const b of rawBiaya) {
    if (!b.programStudi_id) continue;
    const id = String(b.programStudi_id._id);
    if (prodiSeen.has(id)) continue;
    prodiSeen.add(id);
    const p = b.programStudi_id;
    prodiOptions.push({
      value: id,
      label: `${p.singkatan} — ${p.nama}`,
      sublabel: p.jenjang_id?.singkatan,
    });
  }
  prodiOptions.sort((a, b) => a.label.localeCompare(b.label, 'id'));

  const prodiMap: Record<string, ProdiInfo> = {};
  const kelasMap: Record<string, KelasOpt> = {};
  const jadwalMap: Record<string, JadwalOpt> = {};
  for (const b of rawBiaya) {
    if (b.programStudi_id) {
      const p = b.programStudi_id;
      const pid = String(p._id);
      if (!prodiMap[pid]) {
        prodiMap[pid] = {
          id: pid,
          nama: p.nama,
          singkatan: p.singkatan,
          jenjang: p.jenjang_id?.singkatan || '',
          akreditasi: p.akreditasi || '',
          hasAkreditasiFile: !!p.fileAkreditasi?.filename,
          fakultas_nama: p.fakultas_id?.nama || '',
        };
      }
    }
    if (b.kelas_id) {
      const k = b.kelas_id;
      kelasMap[String(k._id)] = { _id: String(k._id), nama: k.nama, singkatan: k.singkatan };
    }
    if (b.jadwal_id) {
      const j = b.jadwal_id;
      jadwalMap[String(j._id)] = {
        _id: String(j._id),
        judul: j.judul,
        tahun: j.tahun,
        ke: Number(j.ke ?? 1),
      };
    }
  }

  return { records, prodiOptions, prodiMap, kelasMap, jadwalMap };
}

/**
 * FR-54: keadaan kosong kalkulator (TBD-16). Nomor WhatsApp dari Pengaturan; bila kosong,
 * hanya tautan ke halaman kontak yang tampil. wa.me butuh kode negara tanpa '+' atau '0' awal,
 * jadi nomor lokal "0812..." diubah menjadi "62812...".
 */
export async function muatKalkulatorKosong(locale: string): Promise<KalkulatorKosong> {
  const [t, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    loadSiteSettings(),
  ]);
  const nomorWhatsApp = (settings?.whatsapp || '').replace(/\D/g, '').replace(/^0/, '62');
  return {
    judul: t('kalkulatorKosongJudul'),
    pesan: t('kalkulatorKosongPesan'),
    labelWhatsApp: t('kalkulatorKosongWhatsApp'),
    labelKontak: t('kalkulatorKosongKontak'),
    urlWhatsApp: nomorWhatsApp ? `https://wa.me/${nomorWhatsApp}` : null,
  };
}
