import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Popup } from '@/models/Popup';
import { requireAdmin } from '@/lib/adminGuard';
import { uploadDir, removeFile } from '@/lib/fileStorage';
import { writeAuditLog } from '@/models/AuditLog';
import { urlHttpOpsional } from '@/lib/validation';

export const runtime = 'nodejs';

const schema = z.object({
  judul: z.string().min(2).max(160).optional(),
  alt: z.string().max(160).optional(),
  url: urlHttpOpsional.optional(),
  urutan: z.number().int().min(0).max(9999).optional(),
  hideForDays: z.number().int().min(0).max(365).optional(),
  durasiTampil: z.number().int().min(0).max(3600).optional(),
  aktif: z.boolean().optional(),
  tampilDari: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  tampilSampai: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const before = await Popup.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const updated = await Popup.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Popup',
    entitasId: id,
    ringkasan: `Ubah popup: ${updated?.judul}`,
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
  const removed = await Popup.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const abs = path.join(uploadDir('popup'), path.basename(removed.gambarFilename));
  await fs.unlink(abs).catch(() => void 0);
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Popup',
    entitasId: id,
    ringkasan: `Hapus popup: ${removed.judul}`,
    before: removed,
  });
  return NextResponse.json({ ok: true });
}
