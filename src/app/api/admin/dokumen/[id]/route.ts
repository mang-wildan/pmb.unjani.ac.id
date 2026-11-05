import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Dokumen } from '@/models/Dokumen';
import { requireAdmin } from '@/lib/adminGuard';
import { removeFile } from '@/lib/fileStorage';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

const patchSchema = z.object({
  kategori: z.enum(['biaya', 'manual-book', 'lainnya']).optional(),
  tahun: z.string().trim().min(4).max(20).optional(),
  judul: z.string().min(2).max(160).optional(),
  judul_en: z.string().max(160).optional(),
  deskripsi: z.string().max(500).optional(),
  urutan: z.number().int().min(0).max(9999).optional(),
  aktif: z.boolean().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const before = await Dokumen.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const updated = await Dokumen.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Dokumen',
    entitasId: id,
    ringkasan: `Ubah dokumen: ${updated?.judul}`,
    before,
    after: updated,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  await connectDb();
  const removed = await Dokumen.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await removeFile(removed.filename);
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Dokumen',
    entitasId: id,
    ringkasan: `Hapus dokumen: ${removed.judul}`,
    before: removed,
  });
  return NextResponse.json({ ok: true });
}
