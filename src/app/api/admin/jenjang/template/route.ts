import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  const lines: string[] = [
    '# ============================================================',
    '# TEMPLATE IMPORT JENJANG — PMB UNJANI',
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
    'Diploma Tiga,D3,#8b5cf6',
    'Diploma Empat,D4,#6366f1',
    'Sarjana,S1,#4f46e5',
    'Profesi,Profesi,#f59e0b',
    'Magister,S2,#10b981',
    'Doktor,S3,#3b82f6',
  ];

  const csv = lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="template-import-jenjang.csv"',
    },
  });
}
