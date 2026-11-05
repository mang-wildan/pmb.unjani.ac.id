import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { Fakultas } from '@/models/Fakultas';
import { Jenjang } from '@/models/Jenjang';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  await connectDb();
  const [fakultasList, jenjangList] = await Promise.all([
    Fakultas.find().sort({ singkatan: 1 }).lean(),
    Jenjang.find().sort({ singkatan: 1 }).lean(),
  ]);

  const fakLines = fakultasList.length > 0
    ? fakultasList.map((f) => `# ${f.singkatan} = ${f.nama}`)
    : ['# (belum ada fakultas — tambahkan dulu via menu Fakultas)'];

  const jenjangLines = jenjangList.length > 0
    ? jenjangList.map((j) => `# ${j.singkatan} = ${j.nama}`)
    : ['# (belum ada jenjang — tambahkan dulu via menu Jenjang)'];

  const lines: string[] = [
    '# ============================================================',
    '# TEMPLATE IMPORT PROGRAM STUDI — PMB UNJANI',
    '# ============================================================',
    '# PETUNJUK:',
    '# 1. Baris diawali # akan diabaikan saat import',
    '# 2. Kolom WAJIB: nama, singkatan, jenjang, fakultas',
    '# 3. Kolom opsional: akreditasi, persyaratan (boleh dikosongkan)',
    '# 4. Kolom persyaratan: pisahkan beberapa persyaratan dengan karakter | (pipe)',
    '# 5. Singkatan akan otomatis diubah menjadi HURUF KAPITAL',
    '# 6. Jika singkatan sudah ada di database, baris tersebut dilewati',
    '#',
    '# DAFTAR JENJANG (isi kolom jenjang dengan SINGKATAN):',
    ...jenjangLines,
    '#',
    '# DAFTAR FAKULTAS (isi kolom fakultas dengan SINGKATAN):',
    ...fakLines,
    '# ============================================================',
    '',
    'nama,singkatan,jenjang,fakultas,akreditasi,persyaratan',
    'Teknik Informatika,TI,' + (jenjangList[0]?.singkatan ?? 'S1') + ',' + (fakultasList[0]?.singkatan ?? 'FT') + ',Unggul,Ijazah SMA/sederajat|SKHUN|Foto 3x4',
    'Manajemen,MNJ,' + (jenjangList[0]?.singkatan ?? 'S1') + ',' + (fakultasList[0]?.singkatan ?? 'FEB') + ',B,',
  ];

  const csv = lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template-import-program-studi.csv"',
    },
  });
}
