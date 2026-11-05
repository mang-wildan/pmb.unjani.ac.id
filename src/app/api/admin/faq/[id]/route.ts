import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { FAQ } from '@/models/FAQ';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

const schema = z.object({
  pertanyaan: z.string().min(5).max(300).optional(),
  jawaban: z.string().min(5).max(2000).optional(),
  pertanyaan_en: z.string().max(300).optional(),
  jawaban_en: z.string().max(2000).optional(),
  kategori: z.enum(['Teknis', 'Biaya', 'Jadwal']).optional(),
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const before = await FAQ.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const updated = await FAQ.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'FAQ',
    entitasId: id,
    ringkasan: `Ubah FAQ: ${updated?.pertanyaan || id}`,
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
  const removed = await FAQ.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'FAQ',
    entitasId: id,
    ringkasan: `Hapus FAQ: ${removed.pertanyaan}`,
    before: removed,
  });
  return NextResponse.json({ ok: true });
}
