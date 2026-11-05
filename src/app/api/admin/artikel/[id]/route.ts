import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/adminGuard';
import { connectDb } from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize';
import { Artikel } from '@/models/Artikel';
import { writeAuditLog } from '@/models/AuditLog';
import { KategoriArtikel } from '@/models/KategoriArtikel';

export const runtime = 'nodejs';

const updateSchema = z.object({
  judul: z.string().trim().min(3).max(160).optional(),
  judul_en: z.string().trim().max(160).optional(),
  isi: z.string().min(1).max(100_000).optional(),
  isi_en: z.string().max(100_000).optional(),
  coverImage: z.string().trim().max(500).optional(),
  status: z.enum(['draft', 'terjadwal', 'terbit', 'arsip']).optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  pinned: z.boolean().optional(),
  kategori_id: z
    .string()
    .refine((value) => mongoose.isValidObjectId(value), { message: 'Kategori tidak valid' })
    .optional(),
  tags: z
    .array(z.string().trim().max(60))
    .max(30)
    .transform((items) => [...new Set(items.filter(Boolean))])
    .optional(),
  metaTitle: z.string().trim().max(120).optional(),
  metaDescription: z.string().trim().max(220).optional(),
  ogImage: z.string().trim().max(500).optional(),
});

type ArtikelAkses = { createdBy?: unknown; deletedAt?: Date | null };

function editorDitolak(artikel: ArtikelAkses, role: string, userId: string) {
  return role === 'editor' && String(artikel.createdBy || '') !== userId;
}

function tanpaGambarSisipan(input: string) {
  return sanitizeRichText(input).replace(/<img\b[^>]*>/gi, '');
}

function badId() {
  return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectDb();
  const item = await Artikel.findById(id).lean();
  if (!item) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  if (editorDitolak(item, guard.session.role, guard.session.sub)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await connectDb();
  const before = await Artikel.findOne({ _id: id, deletedAt: null }).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  if (editorDitolak(before, guard.session.role, guard.session.sub)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const status = parsed.data.status ?? before.status;
  const coverImage = parsed.data.coverImage ?? before.coverImage;
  const publishedAt =
    parsed.data.publishedAt === undefined ? before.publishedAt : parsed.data.publishedAt;
  const issues: Array<{ path: string; message: string }> = [];
  if (status !== 'draft' && !coverImage) {
    issues.push({ path: 'coverImage', message: 'Sampul wajib diisi sebelum artikel diterbitkan' });
  }
  if ((status === 'terjadwal' || status === 'terbit') && !publishedAt) {
    issues.push({ path: 'publishedAt', message: 'Waktu tayang wajib diisi' });
  }
  if (status === 'terjadwal' && publishedAt && publishedAt <= new Date()) {
    issues.push({ path: 'publishedAt', message: 'Waktu tayang terjadwal harus di masa depan' });
  }
  if (issues.length) {
    return NextResponse.json({ error: 'Data tidak valid', details: issues }, { status: 400 });
  }
  if (
    parsed.data.kategori_id &&
    !(await KategoriArtikel.exists({ _id: parsed.data.kategori_id }))
  ) {
    return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { ...parsed.data, updatedBy: guard.session.sub };
  if (parsed.data.isi !== undefined) patch.isi = tanpaGambarSisipan(parsed.data.isi);
  if (parsed.data.isi_en !== undefined) patch.isi_en = tanpaGambarSisipan(parsed.data.isi_en);
  const updated = await Artikel.findByIdAndUpdate(id, patch, { new: true }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Artikel',
    entitasId: id,
    ringkasan: `Ubah artikel: ${updated?.judul || id}`,
    before,
    after: updated,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectDb();
  const before = await Artikel.findOne({ _id: id, deletedAt: null }).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  if (editorDitolak(before, guard.session.role, guard.session.sub)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const removed = await Artikel.findByIdAndUpdate(
    id,
    { deletedAt: new Date(), deletedBy: guard.session.sub },
    { new: true },
  ).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Artikel',
    entitasId: id,
    ringkasan: `Hapus artikel: ${before.judul}`,
    before,
    after: removed,
  });
  return NextResponse.json({ item: removed });
}
