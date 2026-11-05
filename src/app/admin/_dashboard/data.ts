import { Jadwal } from '@/models/Jadwal';
import { Popup } from '@/models/Popup';
import { Pengumuman } from '@/models/Pengumuman';
import { Artikel } from '@/models/Artikel';
import { AuditLog } from '@/models/AuditLog';
import { ProgramStudi } from '@/models/ProgramStudi';
import { canAccessPage, type AdminRole } from '@/lib/permissions';
import { ambilJadwalBerlaku, hitungCakupanBiaya } from '@/lib/notifikasi';
import {
  URUTAN_STATUS,
  batasHari,
  statusJadwal,
  statusPopup,
  type StatusPeriode,
} from '@/lib/statusPeriode';

// Data widget dashboard (FR-65): hanya data terbaru dan aktif, paling banyak BATAS baris per
// widget. Widget untuk modul yang tidak boleh dibuka peran pengguna tidak diambil sama sekali
// (FR-67), sehingga tidak ada kueri maupun tautan ke halaman terlarang.

export const BATAS_BARIS = 5;

export type BarisJadwal = {
  id: string;
  judul: string;
  tahun: string;
  ke: number;
  mulai: Date;
  selesai: Date;
  status: StatusPeriode;
};
export type BarisBiaya = { id: string; judul: string; tahun: string; status: StatusPeriode; nilai: number; total: number };
export type BarisPengumuman = { id: string; judul: string; pinned: boolean; tanggal: Date | null };
export type BarisArtikel = { id: string; judul: string; status: string; tanggal: Date | null };
export type BarisPopup = {
  id: string;
  judul: string;
  tampilDari: Date | null;
  tampilSampai: Date | null;
  status: StatusPeriode;
};
export type BarisAktivitas = { id: string; waktu: Date | null; email: string; aksi: string; entitas: string; ringkasan: string };

export type DataWidget = {
  jadwal: { baris: BarisJadwal[]; total: number } | null;
  biaya: BarisBiaya[] | null;
  pengumuman: BarisPengumuman[];
  artikel: BarisArtikel[];
  popup: { baris: BarisPopup[]; total: number };
  aktivitas: BarisAktivitas[] | null;
};

/** Berjalan dulu, lalu akan datang, nonaktif; di dalam status yang sama mulai terdekat dulu. */
function urut<T extends { status: StatusPeriode }>(daftar: T[], mulai: (x: T) => Date | null): T[] {
  return [...daftar].sort((a, b) => {
    const s = URUTAN_STATUS[a.status] - URUTAN_STATUS[b.status];
    if (s !== 0) return s;
    return (mulai(a)?.getTime() ?? 0) - (mulai(b)?.getTime() ?? 0);
  });
}

const aman = <T>(janji: Promise<T>, nilai: T): Promise<T> => janji.catch(() => nilai);

export async function ambilDataWidget(role: AdminRole, acuan: Date): Promise<DataWidget> {
  const { awal } = batasHari(acuan);
  const bolehJadwal = canAccessPage('/admin/jadwal', role);
  const bolehBiaya = canAccessPage('/admin/biaya', role);
  const bolehLog = canAccessPage('/admin/log-aktivitas', role);

  const [jadwalDb, berlaku, totalProdi, pengumumanDb, artikelDb, popupDb, auditDb] = await Promise.all([
    bolehJadwal
      ? aman(
          Jadwal.find({ selesai: { $gte: awal } })
            .select('judul tahun ke mulai selesai status')
            .lean(),
          [],
        )
      : Promise.resolve(null),
    bolehBiaya ? aman(ambilJadwalBerlaku(acuan), []) : Promise.resolve(null),
    bolehBiaya ? aman(ProgramStudi.countDocuments(), 0) : Promise.resolve(0),
    aman(
      Pengumuman.find({ aktif: true }).select('judul pinned publishedAt').sort({ pinned: -1, publishedAt: -1 }).limit(BATAS_BARIS).lean(),
      [],
    ),
    aman(
      Artikel.find({ deletedAt: null })
        .select('judul status publishedAt createdAt')
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(BATAS_BARIS)
        .lean(),
      [],
    ),
    aman(
      Popup.find({ $or: [{ tampilSampai: null }, { tampilSampai: { $gte: awal } }] })
        .select('judul aktif tampilDari tampilSampai')
        .lean(),
      [],
    ),
    bolehLog ? aman(AuditLog.find().sort({ createdAt: -1 }).limit(BATAS_BARIS).lean(), []) : Promise.resolve(null),
  ]);

  let jadwal: DataWidget['jadwal'] = null;
  if (jadwalDb) {
    const baris: BarisJadwal[] = jadwalDb.map((j) => ({
      id: String(j._id),
      judul: j.judul,
      tahun: j.tahun,
      ke: j.ke,
      mulai: j.mulai,
      selesai: j.selesai,
      status: statusJadwal(j, acuan),
    }));
    const belumArsip = urut(baris.filter((b) => b.status !== 'arsip'), (b) => b.mulai);
    jadwal = { baris: belumArsip.slice(0, BATAS_BARIS), total: belumArsip.length };
  }

  let biaya: DataWidget['biaya'] = null;
  if (berlaku) {
    const cakupan = await aman(hitungCakupanBiaya(berlaku.map((j) => j._id)), new Map<string, number>());
    biaya = berlaku.slice(0, BATAS_BARIS).map((j) => ({
      id: String(j._id),
      judul: j.judul,
      tahun: j.tahun,
      status: j.status,
      nilai: cakupan.get(String(j._id)) ?? 0,
      total: totalProdi,
    }));
  }

  const popupBaris: BarisPopup[] = popupDb.map((p) => ({
    id: String(p._id),
    judul: p.judul,
    tampilDari: p.tampilDari ?? null,
    tampilSampai: p.tampilSampai ?? null,
    status: statusPopup(p, acuan),
  }));
  const popupBelumArsip = urut(popupBaris.filter((p) => p.status !== 'arsip'), (p) => p.tampilDari);

  return {
    jadwal,
    biaya,
    pengumuman: pengumumanDb.map((p) => ({ id: String(p._id), judul: p.judul, pinned: !!p.pinned, tanggal: p.publishedAt ?? null })),
    artikel: artikelDb.map((a) => ({ id: String(a._id), judul: a.judul, status: a.status, tanggal: a.publishedAt ?? a.createdAt ?? null })),
    popup: { baris: popupBelumArsip.slice(0, BATAS_BARIS), total: popupBelumArsip.length },
    aktivitas: auditDb
      ? auditDb.map((a) => ({
          id: String(a._id),
          waktu: a.createdAt ?? null,
          email: a.email ?? '',
          aksi: a.aksi ?? '',
          entitas: a.entitas ?? '',
          ringkasan: a.ringkasan ?? '',
        }))
      : null,
  };
}
