import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  const lines: string[] = [
    '# ============================================================',
    '# TEMPLATE IMPORT FAKULTAS — PMB UNJANI',
    '# ============================================================',
    '# PETUNJUK:',
    '# 1. Baris diawali # akan diabaikan saat import',
    '# 2. Kolom WAJIB: nama, singkatan',
    '# 3. Kolom OPSIONAL: warna (kode hex, contoh #4f46e5)',
    '# 4. Singkatan akan otomatis diubah menjadi HURUF KAPITAL',
    '# 5. Jika singkatan sudah ada di database, baris tersebut dilewati',
    '# ============================================================',
    '',
    'nama,singkatan,warna',
    'Fakultas Teknik,FT,#4f46e5',
    'Fakultas Ekonomi dan Bisnis,FEB,#10b981',
    'Fakultas Hukum,FH,#f59e0b',
  ];

  const csv = lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template-import-fakultas.csv"',
    },
  });
}
