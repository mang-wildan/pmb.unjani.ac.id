import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { requireAdmin } from '@/lib/adminGuard';
import { sanitizeRichText } from '@/lib/sanitize';
import { toSlug } from '@/lib/slug';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const updateSchema = z.object({
  nama: z.string().min(2).max(120).optional(),
  nama_en: z.string().max(120).optional(),
  slug: z.string().trim().min(2).max(80).optional(),
  ringkasan: z.string().max(400).optional(),
  ringkasan_en: z.string().max(400).optional(),
  deskripsi: z.string().max(20000).optional(),
  deskripsi_en: z.string().max(20000).optional(),
  persyaratan: z.array(z.string().max(300)).optional(),
  urutan: z.number().int().min(0).max(9999).optional(),
  aktif: z.boolean().optional(),
  badge: z.string().max(30).optional(),
});

function badId() {
  return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectDb();
  const item = await JalurSeleksi.findById(id).lean();
  if (!item) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ item });
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
  const before = await JalurSeleksi.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.deskripsi !== undefined) patch.deskripsi = sanitizeRichText(parsed.data.deskripsi);
  if (parsed.data.slug) {
    const slugFinal = toSlug(parsed.data.slug);
    const exists = await JalurSeleksi.findOne({ slug: slugFinal, _id: { $ne: id } });
    if (exists) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 });
    patch.slug = slugFinal;
  }
  const updated = await JalurSeleksi.findByIdAndUpdate(id, patch, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'JalurSeleksi',
    entitasId: id,
    ringkasan: `Ubah jalur: ${updated?.nama || id}`,
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
  const removed = await JalurSeleksi.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'JalurSeleksi',
    entitasId: id,
    ringkasan: `Hapus jalur: ${removed.nama}`,
    before: removed,
    ip: clientIpFromHeaders(req.headers),
  });
  return NextResponse.json({ ok: true });
}
