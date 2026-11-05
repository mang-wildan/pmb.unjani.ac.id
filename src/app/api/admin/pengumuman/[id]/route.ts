import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Pengumuman } from '@/models/Pengumuman';
import { requireAdmin } from '@/lib/adminGuard';
import { sanitizeRichText } from '@/lib/sanitize';
import { toSlug } from '@/lib/slug';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

const schema = z.object({
  judul: z.string().min(3).max(160).optional(),
  judul_en: z.string().max(160).optional(),
  slug: z.string().trim().min(3).max(80).optional(),
  ringkasan: z.string().max(320).optional(),
  ringkasan_en: z.string().max(320).optional(),
  konten: z.string().max(50_000).optional(),
  konten_en: z.string().max(50_000).optional(),
  pinned: z.boolean().optional(),
  publishedAt: z.coerce.date().optional(),
  aktif: z.boolean().optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(220).optional(),
});

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  await connectDb();
  const item = await Pengumuman.findById(id).lean();
  if (!item) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  return NextResponse.json(item);
}

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
  const before = await Pengumuman.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.konten !== undefined) patch.konten = sanitizeRichText(parsed.data.konten);
  if (parsed.data.konten_en !== undefined) patch.konten_en = sanitizeRichText(parsed.data.konten_en);
  if (parsed.data.slug) {
    const slug = toSlug(parsed.data.slug);
    const exists = await Pengumuman.findOne({ slug, _id: { $ne: id } });
    if (exists) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 });
    patch.slug = slug;
  }
  const updated = await Pengumuman.findByIdAndUpdate(id, patch, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Pengumuman',
    entitasId: id,
    ringkasan: `Ubah pengumuman: ${updated?.judul || id}`,
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
  const removed = await Pengumuman.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Pengumuman',
    entitasId: id,
    ringkasan: `Hapus pengumuman: ${removed.judul}`,
    before: removed,
  });
  return NextResponse.json({ ok: true });
}
