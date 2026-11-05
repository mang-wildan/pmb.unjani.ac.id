import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { hitungNotifikasi, ringkasNotifikasi } from '@/lib/notifikasi';

export const runtime = 'nodejs';

// Notifikasi admin (FR-62). Hanya membaca, tanpa audit log. Berada di bawah /api/admin/stats
// yang sudah terdaftar untuk semua peran (src/lib/permissions.ts), sehingga izin tidak berubah;
// penyaringan per peran dilakukan di hitungNotifikasi.
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await hitungNotifikasi(guard.session.role, new Date());
  return NextResponse.json(
    { items, ringkasan: ringkasNotifikasi(items) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
