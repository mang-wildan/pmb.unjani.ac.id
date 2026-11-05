import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Kelas } from '@/models/Kelas';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const updateSchema = z.object({
  nama: z.string().min(1).max(120).optional(),
  singkatan: z.string().min(1).max(20).optional(),
});

function badId() {
  return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const before = await Kelas.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const patch: Record<string, unknown> = { ...parsed.data, updatedBy: guard.session.sub };
  if (parsed.data.singkatan) patch.singkatan = parsed.data.singkatan.toUpperCase();
  const updated = await Kelas.findByIdAndUpdate(id, patch, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Kelas',
    entitasId: id,
    ringkasan: `Ubah kelas: ${updated?.nama || id}`,
    before,
    after: updated,
    ip: clientIpFromHeaders(req.headers),
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectDb();
  const removed = await Kelas.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Kelas',
    entitasId: id,
    ringkasan: `Hapus kelas: ${removed.nama}`,
    before: removed,
    ip: clientIpFromHeaders(req.headers),
  });
  return NextResponse.json({ ok: true });
}
