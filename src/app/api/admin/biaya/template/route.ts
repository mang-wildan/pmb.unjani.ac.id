import { type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ProgramStudi } from '@/models/ProgramStudi';
import '@/models/Jenjang';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { Kelas } from '@/models/Kelas';
import { Jadwal } from '@/models/Jadwal';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  await connectDb();
  const [prodis, jalurs, kelases, jadwals] = await Promise.all([
    ProgramStudi.find().populate('jenjang_id', 'singkatan').sort({ singkatan: 1 }).lean(),
    JalurSeleksi.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Kelas.find().sort({ singkatan: 1 }).lean(),
    Jadwal.find({ aktif: true }).sort({ tahun: -1, judul: 1 }).lean(),
  ]);

  const lines: string[] = [];

  lines.push('# ============================================================');
  lines.push('# TEMPLATE IMPORT BIAYA PMB UNJANI');
  lines.push('# ============================================================');
  lines.push('# PETUNJUK:');
  lines.push('# 1. Baris yang diawali dengan # akan diabaikan otomatis saat import');
  lines.push('#    Anda boleh membiarkan baris referensi di bawah atau menghapusnya');
  lines.push('# 2. Kolom WAJIB   : program_studi, jalur, tahun_ajaran, judul_jadwal, biaya');
  lines.push('# 3. Kolom OPSIONAL: kelas, biaya_per_semester, biaya_tambahan');
  lines.push('# 4. Angka biaya ditulis tanpa pemisah ribuan. Contoh: 5000000');
  lines.push('# 5. biaya_per_semester = biaya yang dibayar per semester (opsional)');
  lines.push('# 6. biaya_tambahan = harga per unit per gelombang. Kosongkan jika tidak ada');
  lines.push('# 7. Jika kelas tidak diisi, kosongkan kolom kelas');
  lines.push('# 8. Kombinasi tahun_ajaran + judul_jadwal harus ada di master Jadwal');
  lines.push('# 9. persentase = persentase cicilan, pisahkan dengan | jika lebih');
  lines.push('#    dari satu. Contoh satu: 100%  Contoh dua: 50%|100%');
  lines.push('#    Contoh tiga: 30%|70%|100%  Default jika kosong: 100%');
  lines.push('#');

  // Program Studi
  lines.push('# ------------------------------------------------------------');
  lines.push('# DAFTAR PROGRAM STUDI');
  lines.push('# Isi kolom "program_studi" dengan SINGKATAN di bawah ini:');
  lines.push('# ------------------------------------------------------------');
  if (prodis.length === 0) {
    lines.push('# (Belum ada program studi — tambahkan dulu di menu Program Studi)');
  } else {
    prodis.forEach((p) => {
      lines.push(`# ${p.singkatan.padEnd(10)} = ${p.nama} (${(p.jenjang_id as any)?.singkatan || '-'})`);
    });
  }
  lines.push('#');

  // Jalur Seleksi
  lines.push('# ------------------------------------------------------------');
  lines.push('# DAFTAR JALUR SELEKSI');
  lines.push('# Isi kolom "jalur" dengan NAMA JALUR persis seperti di bawah:');
  lines.push('# ------------------------------------------------------------');
  if (jalurs.length === 0) {
    lines.push('# (Belum ada jalur seleksi — tambahkan dulu di menu Jalur Seleksi)');
  } else {
    jalurs.forEach((j) => lines.push(`# ${j.nama}`));
  }
  lines.push('#');

  // Kelas
  lines.push('# ------------------------------------------------------------');
  lines.push('# DAFTAR KELAS (opsional)');
  lines.push('# Isi kolom "kelas" dengan SINGKATAN di bawah, atau kosongkan:');
  lines.push('# ------------------------------------------------------------');
  if (kelases.length === 0) {
    lines.push('# (Belum ada kelas — tambahkan dulu di menu Kelas)');
  } else {
    kelases.forEach((k) => lines.push(`# ${k.singkatan.padEnd(10)} = ${k.nama}`));
  }
  lines.push('#');

  // Jadwal
  lines.push('# ------------------------------------------------------------');
  lines.push('# DAFTAR JADWAL (WAJIB)');
  lines.push('# Isi kolom "tahun_ajaran" dan "judul_jadwal" dengan pasangan');
  lines.push('# yang valid. Format referensi: TAHUN_AJARAN | JUDUL_JADWAL');
  lines.push('# ------------------------------------------------------------');
  if (jadwals.length === 0) {
    lines.push('# (Belum ada jadwal — tambahkan dulu di menu Jadwal)');
  } else {
    jadwals.forEach((j) => lines.push(`# ${(j as any).tahun} | ${j.judul}`));
  }
  lines.push('# ============================================================');
  lines.push('');

  // Header row
  lines.push('program_studi,jalur,kelas,tahun_ajaran,judul_jadwal,biaya,biaya_per_semester,biaya_tambahan,persentase');

  // Example rows
  const p0 = prodis[0];
  const j0 = jalurs[0];
  const k0 = kelases[0];
  const jd0 = jadwals[0];

  lines.push(
    [
      p0?.singkatan ?? 'TI',
      j0?.nama ?? 'Reguler',
      k0?.singkatan ?? '',
      (jd0 as any)?.tahun ?? '',
      jd0?.judul ?? '',
      '5000000',
      '1000000',
      '500000',
      '50%|100%',
    ].join(','),
  );

  if (p0 && j0) {
    lines.push([
      p0.singkatan,
      j0.nama,
      '',
      (jd0 as any)?.tahun ?? '2026/2027',
      jd0?.judul ?? 'Pendaftaran Gelombang 1',
      '4500000',
      '',
      '0',
      '100%',
    ].join(','));
  }

  const csv = lines.join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template-import-biaya.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
