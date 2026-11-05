import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { Jadwal } from '@/models/Jadwal';
import { Dokumen } from '@/models/Dokumen';
import { Pengumuman } from '@/models/Pengumuman';
import { AuditLog } from '@/models/AuditLog';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const [jalur, jadwal, dokumen, pengumuman, auditTerbaru] = await Promise.all([
    JalurSeleksi.countDocuments({ aktif: true }),
    Jadwal.countDocuments({ aktif: true }),
    Dokumen.countDocuments({ aktif: true }),
    Pengumuman.countDocuments({ aktif: true }),
    AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return NextResponse.json({
    counts: { jalur, jadwal, dokumen, pengumuman },
    auditTerbaru,
  });
}
