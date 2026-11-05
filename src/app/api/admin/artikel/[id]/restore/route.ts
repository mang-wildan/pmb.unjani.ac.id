import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { connectDb } from '@/lib/db';
import { Artikel } from '@/models/Artikel';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }

  await connectDb();
  const before = await Artikel.findOne({ _id: id, deletedAt: { $ne: null } }).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  if (
    guard.session.role === 'editor' &&
    String(before.createdBy || '') !== guard.session.sub
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const restored = await Artikel.findByIdAndUpdate(
    id,
    { deletedAt: null, deletedBy: null },
    { new: true },
  ).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'restore',
    entitas: 'Artikel',
    entitasId: id,
    ringkasan: `Pulihkan artikel: ${before.judul}`,
    before,
    after: restored,
  });
  return NextResponse.json({ item: restored });
}
