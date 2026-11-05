// Aturan status periode bersama (FR-61): Jadwal, Popup, dan (lewat jadwalnya) Biaya.
// Fungsi murni tanpa impor server atau pustaka tanggal, sehingga identik di server dan klien.
// "Hari" mengikuti waktu lokal proses (WIB pada server dan perangkat admin). Hari terakhir
// periode masih dihitung berjalan, sama dengan saringan biaya landing (FR-53).

export type StatusPeriode = 'berjalan' | 'akan-datang' | 'nonaktif' | 'arsip';

type TanggalMasuk = Date | string | number | null | undefined;

const MS_HARI = 24 * 60 * 60 * 1000;

/** Urutan tampil: berjalan dulu, lalu akan datang, lalu nonaktif, terakhir arsip. */
export const URUTAN_STATUS: Record<StatusPeriode, number> = {
  berjalan: 0,
  'akan-datang': 1,
  nonaktif: 2,
  arsip: 3,
};

export const LABEL_STATUS: Record<StatusPeriode, string> = {
  berjalan: 'Berjalan',
  'akan-datang': 'Akan datang',
  nonaktif: 'Nonaktif',
  arsip: 'Arsip',
};

/** Tanggal tidak valid atau kosong menjadi null. */
function keTanggal(nilai: TanggalMasuk): Date | null {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  const d = nilai instanceof Date ? nilai : new Date(nilai);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Awal (00.00) dan akhir (23.59.59.999) hari kalender dari waktu acuan. */
export function batasHari(acuan: Date = new Date()): { awal: Date; akhir: Date } {
  const awal = new Date(acuan);
  awal.setHours(0, 0, 0, 0);
  const akhir = new Date(acuan);
  akhir.setHours(23, 59, 59, 999);
  return { awal, akhir };
}

/** Status satu periode. Arsip dinilai lebih dulu: data lewat tetap Arsip walau nonaktif. */
function hitungStatus(
  mulai: Date | null,
  selesai: Date | null,
  aktif: boolean,
  acuan: Date,
): StatusPeriode {
  const { awal, akhir } = batasHari(acuan);
  if (selesai && selesai < awal) return 'arsip';
  if (!aktif) return 'nonaktif';
  if (mulai && mulai > akhir) return 'akan-datang';
  return 'berjalan';
}

/** FR-61: jadwal. `mulai` dan `selesai` wajib di skema; nilai rusak diperlakukan tanpa batas. */
export function statusJadwal(
  jadwal: { mulai?: TanggalMasuk; selesai?: TanggalMasuk; status?: boolean | null },
  acuan: Date = new Date(),
): StatusPeriode {
  return hitungStatus(keTanggal(jadwal.mulai), keTanggal(jadwal.selesai), jadwal.status !== false, acuan);
}

/** FR-61: popup. `tampilDari` kosong = sejak awal, `tampilSampai` kosong = tanpa akhir. */
export function statusPopup(
  popup: { tampilDari?: TanggalMasuk; tampilSampai?: TanggalMasuk; aktif?: boolean | null },
  acuan: Date = new Date(),
): StatusPeriode {
  return hitungStatus(keTanggal(popup.tampilDari), keTanggal(popup.tampilSampai), popup.aktif !== false, acuan);
}

/** Selisih hari kalender (b - a), mengabaikan jam. */
function selisihHari(a: Date, b: Date): number {
  const awalA = batasHari(a).awal.getTime();
  const awalB = batasHari(b).awal.getTime();
  return Math.round((awalB - awalA) / MS_HARI);
}

/** Jumlah hari periode, hari awal dan akhir dihitung. Null bila batas tidak lengkap. */
export function totalHari(mulai: TanggalMasuk, selesai: TanggalMasuk): number | null {
  const m = keTanggal(mulai);
  const s = keTanggal(selesai);
  return m && s ? selisihHari(m, s) + 1 : null;
}

/** Hari ke-berapa hari ini dalam periode (1 = hari mulai). Null bila belum mulai atau tanpa batas mulai. */
export function hariKe(mulai: TanggalMasuk, acuan: Date = new Date()): number | null {
  const m = keTanggal(mulai);
  if (!m) return null;
  const n = selisihHari(m, acuan) + 1;
  return n >= 1 ? n : null;
}

/** Sisa hari sampai selesai (0 = hari terakhir). Null bila tanpa batas selesai atau sudah lewat. */
export function sisaHari(selesai: TanggalMasuk, acuan: Date = new Date()): number | null {
  const s = keTanggal(selesai);
  if (!s) return null;
  const n = selisihHari(acuan, s);
  return n >= 0 ? n : null;
}

/** Hari sampai periode mulai. Null bila sudah mulai atau tanpa tanggal mulai. */
export function hariMenujuMulai(mulai: TanggalMasuk, acuan: Date = new Date()): number | null {
  const m = keTanggal(mulai);
  if (!m) return null;
  const n = selisihHari(acuan, m);
  return n > 0 ? n : null;
}
