import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Jadwal } from '@/models/Jadwal';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const updateSchema = z.object({
  judul:   z.string().min(2).max(160).optional(),
  ke:      z.number().int().positive().optional(),
  jalur:   z.array(z.string().min(1)).min(1, 'Minimal satu jalur harus dipilih').optional(),
  mulai:   z.coerce.date().optional(),
  selesai: z.coerce.date().optional(),
  status:  z.boolean().optional(),
  tahun:   z.string().min(4).max(20).optional(),
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
  if (parsed.data.mulai && parsed.data.selesai && parsed.data.selesai < parsed.data.mulai) {
    return NextResponse.json({ error: 'Tanggal selesai harus setelah tanggal mulai' }, { status: 400 });
  }
  await connectDb();
  const before = await Jadwal.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const patch = { ...parsed.data, updatedBy: guard.session.sub };
  const updated = await Jadwal.findByIdAndUpdate(id, patch, { new: true })
    .populate('jalur', 'nama')
    .lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Jadwal',
    entitasId: id,
    ringkasan: `Ubah jadwal: ${updated?.judul || id}`,
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
  const removed = await Jadwal.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Jadwal',
    entitasId: id,
    ringkasan: `Hapus jadwal: ${removed.judul}`,
    before: removed,
    ip: clientIpFromHeaders(req.headers),
  });
  return NextResponse.json({ ok: true });
}
