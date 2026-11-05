import type { Types } from 'mongoose';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Jadwal } from '@/models/Jadwal';
import { Biaya } from '@/models/Biaya';
import { ProgramStudi } from '@/models/ProgramStudi';
import { Popup } from '@/models/Popup';
import { Artikel } from '@/models/Artikel';
import { canAccessPage, type AdminRole } from '@/lib/permissions';
import { batasHari, hariMenujuMulai, sisaHari, statusJadwal, statusPopup } from '@/lib/statusPeriode';

// Notifikasi admin yang dihitung dari data saat diminta (FR-62, PLAN A2). Tidak ada koleksi:
// butir hilang sendiri begitu kondisinya selesai. Server saja; pemanggil wajib `connectDb()` dulu.
// Setiap butir hanya diberikan kepada peran yang boleh membuka halaman tujuannya
// (`canAccessPage`), sehingga editor tidak menerima butir Jadwal, Biaya, maupun Program Studi.

export type TingkatNotifikasi = 'kritis' | 'peringatan' | 'info';

export type KodeNotifikasi = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6' | 'N7' | 'N8';

export type ButirNotifikasi = {
  /** Unik per butir, untuk key React. */
  id: string;
  kode: KodeNotifikasi;
  tingkat: TingkatNotifikasi;
  judul: string;
  teks: string;
  /** Halaman tujuan tombol aksi, selalu tanpa `?tab` (tab bawaan, FR-73). */
  href: string;
  labelAksi: string;
  /** Untuk bilah progres cakupan biaya. */
  progres?: { nilai: number; total: number };
};

export type RingkasanNotifikasi = Record<TingkatNotifikasi, number>;

/** Batas hari pemeriksaan (TBD-04). */
export const BATAS_HARI = {
  /** N4: jadwal akan datang yang mulai dalam rentang ini diperiksa biayanya. */
  jadwalAkanMulai: 30,
  /** N5: jadwal berjalan yang berakhir dalam rentang ini tanpa gelombang berikutnya. */
  jadwalAkanBerakhir: 7,
  /** N6: popup berjalan yang berakhir dalam rentang ini tanpa pengganti. */
  popupAkanBerakhir: 3,
  /** N7: artikel draf yang tidak diubah lebih lama dari ini. */
  artikelDrafLama: 14,
} as const;

const URUTAN_TINGKAT: Record<TingkatNotifikasi, number> = { kritis: 0, peringatan: 1, info: 2 };

const HREF = {
  jadwal: '/admin/jadwal',
  biaya: '/admin/biaya',
  popup: '/admin/popup',
  artikel: '/admin/artikel',
  programStudi: '/admin/program-studi',
} as const;

export type JadwalBerlaku = {
  _id: Types.ObjectId;
  judul: string;
  tahun: string;
  mulai: Date;
  selesai: Date;
  status: 'berjalan' | 'akan-datang';
};

/**
 * Jadwal berlaku: aktif dan belum berakhir (hari ini masih dihitung), sama dengan sumber biaya
 * landing (FR-53). Diurutkan dari tanggal mulai terdekat.
 */
export async function ambilJadwalBerlaku(acuan: Date = new Date()): Promise<JadwalBerlaku[]> {
  const { awal } = batasHari(acuan);
  const daftar = await Jadwal.find({ status: true, selesai: { $gte: awal } })
    .select('judul tahun mulai selesai status')
    .sort({ mulai: 1 })
    .lean();
  return daftar.flatMap((j) => {
    const status = statusJadwal(j, acuan);
    if (status !== 'berjalan' && status !== 'akan-datang') return [];
    return [{ _id: j._id, judul: j.judul, tahun: j.tahun, mulai: j.mulai, selesai: j.selesai, status }];
  });
}

/**
 * Cakupan biaya: jumlah program studi unik yang punya minimal satu data biaya per jadwal.
 * Beberapa baris biaya satu prodi (jalur/kelas berbeda) dihitung satu.
 */
export async function hitungCakupanBiaya(idJadwal: Types.ObjectId[]): Promise<Map<string, number>> {
  if (idJadwal.length === 0) return new Map();
  const hasil = await Biaya.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { jadwal_id: { $in: idJadwal } } },
    { $group: { _id: { jadwal: '$jadwal_id', prodi: '$programStudi_id' } } },
    { $group: { _id: '$_id.jadwal', n: { $sum: 1 } } },
  ]);
  return new Map(hasil.map((h) => [String(h._id), h.n]));
}

function tanggal(d: Date): string {
  return dayjs(d).locale('id').format('D MMMM YYYY');
}

function lagi(hari: number): string {
  return hari === 0 ? 'hari ini' : `${hari} hari lagi`;
}

function namaJadwal(j: { judul: string; tahun: string }): string {
  return j.tahun ? `${j.judul} (${j.tahun})` : j.judul;
}

/** Kueri yang gagal menghasilkan null; butir yang bergantung padanya dilewati, bukan dianggap kosong. */
function aman<T>(janji: Promise<T>): Promise<T | null> {
  return janji.catch(() => null);
}

async function periksaJadwalDanBiaya(acuan: Date): Promise<ButirNotifikasi[]> {
  const [berlaku, totalProdi] = await Promise.all([
    aman(ambilJadwalBerlaku(acuan)),
    aman(ProgramStudi.countDocuments()),
  ]);
  if (berlaku === null) return [];

  const butir: ButirNotifikasi[] = [];

  // N2: tanpa jadwal berlaku, landing tidak menampilkan gelombang maupun biaya.
  if (berlaku.length === 0) {
    butir.push({
      id: 'N2',
      kode: 'N2',
      tingkat: 'kritis',
      judul: 'Tidak ada gelombang pendaftaran aktif',
      teks: 'Tidak ada jadwal aktif yang sedang berjalan maupun akan datang. Landing tidak menampilkan gelombang pendaftaran dan kalkulator biaya kosong.',
      href: HREF.jadwal,
      labelAksi: 'Buka jadwal',
    });
    return butir;
  }

  const cakupan = await aman(hitungCakupanBiaya(berlaku.map((j) => j._id)));
  const adaAkanDatang = berlaku.some((j) => j.status === 'akan-datang');

  for (const j of berlaku) {
    const id = String(j._id);
    const n = cakupan?.get(id) ?? 0;
    const bisaHitungCakupan = cakupan !== null && totalProdi !== null && totalProdi > 0;

    if (j.status === 'berjalan') {
      if (cakupan !== null && n === 0) {
        // N1: gelombang berjalan tanpa biaya sama sekali (TBD-01).
        butir.push({
          id: `N1-${id}`,
          kode: 'N1',
          tingkat: 'kritis',
          judul: `Biaya ${namaJadwal(j)} belum diinput`,
          teks: 'Gelombang ini sedang berjalan, tetapi belum ada data biaya. Kalkulator biaya di landing kosong untuk gelombang ini.',
          href: HREF.biaya,
          labelAksi: 'Isi biaya',
          ...(bisaHitungCakupan ? { progres: { nilai: 0, total: totalProdi } } : {}),
        });
      } else if (bisaHitungCakupan && n < totalProdi) {
        // N3: gelombang berjalan dengan biaya belum lengkap.
        butir.push({
          id: `N3-${id}`,
          kode: 'N3',
          tingkat: 'peringatan',
          judul: `Biaya ${namaJadwal(j)} baru ${n} dari ${totalProdi} prodi`,
          teks: 'Gelombang ini sedang berjalan. Kalkulator biaya di landing hanya menampilkan prodi yang sudah punya biaya.',
          href: HREF.biaya,
          labelAksi: 'Lengkapi biaya',
          progres: { nilai: n, total: totalProdi },
        });
      }

      // N5: gelombang berakhir sebentar lagi tanpa gelombang berikutnya.
      const sisa = sisaHari(j.selesai, acuan);
      if (!adaAkanDatang && sisa !== null && sisa <= BATAS_HARI.jadwalAkanBerakhir) {
        butir.push({
          id: `N5-${id}`,
          kode: 'N5',
          tingkat: 'peringatan',
          judul: `${namaJadwal(j)} berakhir ${lagi(sisa)}`,
          teks: `Berakhir ${tanggal(j.selesai)}. Belum ada gelombang berikutnya yang aktif.`,
          href: HREF.jadwal,
          labelAksi: 'Buka jadwal',
        });
      }
    } else {
      // N4: gelombang akan datang yang biayanya belum lengkap.
      const menuju = hariMenujuMulai(j.mulai, acuan);
      if (bisaHitungCakupan && menuju !== null && menuju <= BATAS_HARI.jadwalAkanMulai && n < totalProdi) {
        butir.push({
          id: `N4-${id}`,
          kode: 'N4',
          tingkat: 'peringatan',
          judul: `${namaJadwal(j)} mulai ${lagi(menuju)}`,
          teks: `Mulai ${tanggal(j.mulai)}. Biaya terisi ${n} dari ${totalProdi} prodi.`,
          href: HREF.biaya,
          labelAksi: 'Isi biaya',
          progres: { nilai: n, total: totalProdi },
        });
      }
    }
  }
  return butir;
}

async function periksaPopup(acuan: Date): Promise<ButirNotifikasi[]> {
  const { awal } = batasHari(acuan);
  const daftar = await aman(
    Popup.find({ aktif: true, $or: [{ tampilSampai: null }, { tampilSampai: { $gte: awal } }] })
      .select('judul tampilDari tampilSampai aktif')
      .lean(),
  );
  if (!daftar) return [];
  const adaPengganti = daftar.some((p) => statusPopup(p, acuan) === 'akan-datang');
  if (adaPengganti) return [];

  // N6: popup tayang berakhir sebentar lagi tanpa popup terjadwal.
  return daftar.flatMap((p) => {
    if (!p.tampilSampai || statusPopup(p, acuan) !== 'berjalan') return [];
    const sisa = sisaHari(p.tampilSampai, acuan);
    if (sisa === null || sisa > BATAS_HARI.popupAkanBerakhir) return [];
    return [
      {
        id: `N6-${String(p._id)}`,
        kode: 'N6' as const,
        tingkat: 'peringatan' as const,
        judul: `Popup "${p.judul}" berakhir ${lagi(sisa)}`,
        teks: `Tayang sampai ${tanggal(p.tampilSampai)}. Belum ada popup pengganti yang terjadwal.`,
        href: HREF.popup,
        labelAksi: 'Buka popup',
      },
    ];
  });
}

async function periksaArtikel(acuan: Date): Promise<ButirNotifikasi[]> {
  const batas = new Date(acuan.getTime() - BATAS_HARI.artikelDrafLama * 24 * 60 * 60 * 1000);
  const n = await aman(Artikel.countDocuments({ status: 'draft', deletedAt: null, updatedAt: { $lt: batas } }));
  if (!n) return [];
  // N7
  return [
    {
      id: 'N7',
      kode: 'N7',
      tingkat: 'info',
      judul: `${n} artikel draf belum diperbarui lebih dari ${BATAS_HARI.artikelDrafLama} hari`,
      teks: 'Terbitkan, perbarui, atau hapus draf yang tidak dipakai lagi.',
      href: HREF.artikel,
      labelAksi: 'Buka artikel',
    },
  ];
}

async function periksaAkreditasi(): Promise<ButirNotifikasi[]> {
  const n = await aman(
    ProgramStudi.countDocuments({ $or: [{ akreditasi: '' }, { akreditasi: { $exists: false } }] }),
  );
  if (!n) return [];
  // N8
  return [
    {
      id: 'N8',
      kode: 'N8',
      tingkat: 'info',
      judul: `${n} prodi belum punya akreditasi`,
      teks: 'Status akreditasi tampil di penjelajah program studi di landing.',
      href: HREF.programStudi,
      labelAksi: 'Buka program studi',
    },
  ];
}

/**
 * Semua butir notifikasi untuk satu peran, terurut Kritis → Peringatan → Info. Pemeriksaan untuk
 * halaman yang tidak boleh dibuka peran itu tidak dijalankan sama sekali.
 */
export async function hitungNotifikasi(role: AdminRole, acuan: Date = new Date()): Promise<ButirNotifikasi[]> {
  const boleh = (href: string) => canAccessPage(href, role);
  const pemeriksaan: Promise<ButirNotifikasi[]>[] = [];
  if (boleh(HREF.jadwal) && boleh(HREF.biaya)) pemeriksaan.push(periksaJadwalDanBiaya(acuan));
  if (boleh(HREF.popup)) pemeriksaan.push(periksaPopup(acuan));
  if (boleh(HREF.artikel)) pemeriksaan.push(periksaArtikel(acuan));
  if (boleh(HREF.programStudi)) pemeriksaan.push(periksaAkreditasi());

  const semua = (await Promise.all(pemeriksaan.map((p) => p.catch(() => [] as ButirNotifikasi[])))).flat();
  // Saringan akhir: jaga-jaga bila suatu pemeriksaan menghasilkan tautan ke halaman lain.
  return semua
    .filter((b) => boleh(b.href))
    .map((b, i) => ({ b, i }))
    .sort((x, y) => URUTAN_TINGKAT[x.b.tingkat] - URUTAN_TINGKAT[y.b.tingkat] || x.i - y.i)
    .map(({ b }) => b);
}

/** Jumlah butir per tingkat, untuk strip dashboard dan badge sidebar. */
export function ringkasNotifikasi(butir: ButirNotifikasi[]): RingkasanNotifikasi {
  const r: RingkasanNotifikasi = { kritis: 0, peringatan: 0, info: 0 };
  for (const b of butir) r[b.tingkat] += 1;
  return r;
}
