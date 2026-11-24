import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { ProgramStudi } from '@/models/ProgramStudi';
import { Biaya } from '@/models/Biaya';
import { Jadwal } from '@/models/Jadwal';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { FAQ } from '@/models/FAQ';
import { Dokumen } from '@/models/Dokumen';
import { Pengumuman } from '@/models/Pengumuman';
import '@/models/Kelas';
import '@/models/Jenjang';
import '@/models/Fakultas';

export type Bukti = { id: string; judul: string; ringkas: string; url: string };
export class KlarifikasiError extends Error {}
export class KonflikError extends Error {}
const teks = z.string().trim().min(1).max(100).optional();
export const argSchema = z.object({ nama: teks, prodi: teks, jenjang: teks, fakultas: teks, jalur: teks, kelas: teks, tahun: teks, periode: teks, kataKunci: teks, kategori: teks }).strict();
type Arg = z.infer<typeof argSchema>;
export const filterAktif = { aktif: true } as const;
/** Sabuk kedua setelah query: dokumen tanpa `aktif: true` eksplisit tidak pernah lolos. */
export function hanyaAktif<T extends { aktif?: unknown }>(rows: T[]): T[] {
  return rows.filter(r => r.aktif === true);
}
export function regexAman(s: string) { return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
const bersih = (s: unknown) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+|www\.\S+/gi, '[tautan pada sumber]').replace(/\s+/g, ' ').trim().slice(0, 1800);
const bukti = (jenis: string, id: unknown, judul: string, ringkas: string, url: string): Bukti => ({ id: `${jenis}:${id}`, judul: bersih(judul), ringkas: bersih(ringkas), url });
function batasi<T>(rows: T[]): T[] { if (rows.length > 20) throw new KlarifikasiError(); return rows; }
const cocok = (s: unknown, q?: string) => !q || regexAman(q).test(String(s ?? ''));
const hari = (d: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
export function statusJadwal(mulai: Date | string, selesai: Date | string, now = new Date()): 'dibuka' | 'ditutup' | 'belum' {
  if (hari(selesai) < hari(now)) return 'ditutup';
  return hari(mulai) > hari(now) ? 'belum' : 'dibuka';
}
const tanggal = (d: Date | string) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long' }).format(new Date(d));
const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export async function cariProdi(arg: Arg): Promise<Bukti[]> {
  const a = argSchema.parse(arg); await connectDb();
  const rows = await ProgramStudi.find({ aktif: true, ...(a.nama ? { nama: regexAman(a.nama) } : {}) })
    .select('aktif nama singkatan akreditasi persyaratan jenjang_id fakultas_id').populate('jenjang_id', 'nama singkatan').populate('fakultas_id', 'nama').limit(21).maxTimeMS(5000).lean();
  return batasi(hanyaAktif(rows)).filter(p => cocok((p.jenjang_id as unknown as { nama?: string })?.nama, a.jenjang) && cocok((p.fakultas_id as unknown as { nama?: string })?.nama, a.fakultas))
    .map(p => bukti('prodi', p._id, p.nama, `${p.nama} (${p.singkatan}). Akreditasi: ${p.akreditasi || 'belum tersedia'}. Persyaratan: ${p.persyaratan.join('; ')}`, '/#program-studi'));
}

export async function cariJadwal(arg: Arg): Promise<Bukti[]> {
  const a = argSchema.parse(arg); await connectDb();
  const jalur = await JalurSeleksi.find({ aktif: true, ...(a.jalur ? { nama: regexAman(a.jalur) } : {}) }).select('_id nama').limit(21).maxTimeMS(5000).lean();
  batasi(jalur);
  const rows = await Jadwal.find({ status: true, jalur: { $in: jalur.map(j => j._id) }, ...(a.tahun ? { tahun: a.tahun } : {}), ...(a.periode ? { judul: regexAman(a.periode) } : {}) })
    .select('judul tahun ke mulai selesai jalur').sort({ mulai: 1 }).limit(21).maxTimeMS(5000).lean();
  return batasi(rows).map(j => bukti('jadwal', j._id, `${j.judul} ${j.tahun}`, `Gelombang ${j.ke}, ${j.tahun}. Jalur: ${jalur.filter(p => j.jalur.some(id => String(id) === String(p._id))).map(p => p.nama).join(', ')}. ${tanggal(j.mulai)} sampai ${tanggal(j.selesai)} WIB. Status pendaftaran: ${statusJadwal(j.mulai, j.selesai)}.`, '/jadwal-pmb'));
}

export async function cariBiaya(arg: Arg): Promise<Bukti[]> {
  const a = argSchema.parse(arg);
  if (!a.prodi) throw new KlarifikasiError();
  await connectDb();
  const rows = await Biaya.find({ aktif: true }).select('aktif biaya biayaPerSemester biayaTambahan persentase programStudi_id jalur_id jadwal_id kelas_id')
    .populate({ path: 'programStudi_id', match: { aktif: true, nama: regexAman(a.prodi) }, select: 'nama aktif' })
    .populate({ path: 'jalur_id', match: { aktif: true, ...(a.jalur ? { nama: regexAman(a.jalur) } : {}) }, select: 'nama aktif' })
    .populate({ path: 'jadwal_id', match: { status: true, ...(a.tahun ? { tahun: a.tahun } : {}), ...(a.periode ? { judul: regexAman(a.periode) } : {}) }, select: 'judul tahun ke mulai selesai status jalur' })
    .populate('kelas_id', 'nama').limit(201).maxTimeMS(5000).lean();
  // ponytail: batas keselamatan, bukan pemilihan tarif; persempit kueri bila katalog >200 baris.
  if (rows.length > 200) throw new KlarifikasiError();
  const valid = hanyaAktif(rows).filter(b => b.programStudi_id && b.jalur_id && b.jadwal_id).map(b => ({ ...b,
    prodi: b.programStudi_id as unknown as { nama: string }, jalur: b.jalur_id as unknown as { _id: unknown; nama: string },
    jadwal: b.jadwal_id as unknown as { judul: string; tahun: string; ke: number; mulai: Date; selesai: Date; jalur: unknown[] },
    kelas: b.kelas_id as unknown as { nama: string } | null,
  })).filter(b => cocok(b.kelas?.nama, a.kelas) && b.jadwal.jalur.some(id => String(id) === String(b.jalur._id)));
  if (valid.length > 1) {
    const identitas = (v: unknown): string => String((v as { _id?: unknown } | null)?._id ?? v ?? '');
    const kombinasi = new Map<string, string>();
    for (const b of valid) {
      const key = [b.programStudi_id, b.jalur_id, b.jadwal_id, b.kelas_id].map(identitas).join('/');
      const tarif = JSON.stringify([b.biaya, b.biayaPerSemester, b.biayaTambahan, b.persentase]);
      if (kombinasi.has(key) && kombinasi.get(key) !== tarif) throw new KonflikError();
      kombinasi.set(key, tarif);
    }
    throw new KlarifikasiError();
  }
  return valid.map(b => bukti('biaya', b._id, `Biaya ${b.prodi.nama}`, `${b.prodi.nama}; jalur ${b.jalur.nama}; kelas ${b.kelas?.nama || 'tanpa kelas khusus'}; ${b.jadwal.judul}, ${b.jadwal.tahun}, gelombang ${b.jadwal.ke}. Status pendaftaran: ${statusJadwal(b.jadwal.mulai, b.jadwal.selesai)} (${tanggal(b.jadwal.mulai)}–${tanggal(b.jadwal.selesai)} WIB). Biaya pokok: ${rupiah(b.biaya)}. ${b.biayaPerSemester != null ? `Estimasi biaya per semester: ${rupiah(b.biayaPerSemester)}.` : 'Estimasi biaya per semester belum tersedia.'} ${b.biayaTambahan != null ? `SPT per unit: ${rupiah(b.biayaTambahan)}; minimal unit mengikuti gelombang (${b.jadwal.ke}).` : ''} Pilihan persentase pembayaran: ${b.persentase.join(', ')}. Kalkulator: bulatkan((biaya pokok + unit × SPT) × persentase/100).`, '/#kalkulator'));
}

export async function cariFaq(arg: Arg): Promise<Bukti[]> {
  const a = argSchema.parse(arg); await connectDb();
  const rows = await FAQ.find({ aktif: true, ...(a.kategori ? { kategori: a.kategori } : {}), ...(a.kataKunci ? { $or: [{ pertanyaan: regexAman(a.kataKunci) }, { jawaban: regexAman(a.kataKunci) }] } : {}) }).select('aktif pertanyaan jawaban kategori').limit(21).maxTimeMS(5000).lean();
  return batasi(hanyaAktif(rows)).map(f => bukti('faq', f._id, f.pertanyaan, f.jawaban, '/faq'));
}
export async function cariDokumen(arg: Arg): Promise<Bukti[]> {
  const a = argSchema.parse(arg); await connectDb();
  const rows = await Dokumen.find({ aktif: true, ...(a.tahun ? { tahun: a.tahun } : {}), ...(a.kataKunci ? { judul: regexAman(a.kataKunci) } : {}) }).select('aktif judul tahun kategori').limit(21).maxTimeMS(5000).lean();
  return batasi(hanyaAktif(rows)).map(d => bukti('dokumen', d._id, d.judul, `Dokumen ${d.judul}, tahun ${d.tahun}, kategori ${d.kategori}. Hanya metadata; silakan baca dokumen resmi. Isi PDF belum diverifikasi chatbot.`, `/api/files/${encodeURIComponent(String(d._id))}`));
}
export async function cariPengumuman(arg: Arg): Promise<Bukti[]> {
  const a = argSchema.parse(arg); await connectDb();
  const rows = await Pengumuman.find({ aktif: true, publishedAt: { $lte: new Date() }, ...(a.kataKunci ? { judul: regexAman(a.kataKunci) } : {}) }).select('aktif judul ringkasan slug').limit(21).maxTimeMS(5000).lean();
  return batasi(hanyaAktif(rows)).map(p => bukti('pengumuman', p._id, p.judul, p.ringkasan, `/pengumuman/${encodeURIComponent(p.slug)}`));
}
const fungsi = { cari_prodi: cariProdi, cari_biaya: cariBiaya, cari_jadwal: cariJadwal, cari_faq: cariFaq, cari_dokumen: cariDokumen, cari_pengumuman: cariPengumuman };
export async function jalankanTool(nama: string, arg: unknown): Promise<Bukti[]> {
  if (!Object.hasOwn(fungsi, nama)) throw new Error('Tool tidak valid');
  return fungsi[nama as keyof typeof fungsi](argSchema.parse(arg));
}
export const TOOLS = Object.keys(fungsi).map(name => ({ name, description: `Baca sumber publik aktif: ${name}. Hasil terlalu luas harus diklarifikasi.`, parameters: { type: 'object', properties: Object.fromEntries(Object.keys(argSchema.shape).map(k => [k, { type: 'string' }])), additionalProperties: false } }));
