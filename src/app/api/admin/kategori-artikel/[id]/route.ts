import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { toSlug } from '@/lib/slug';
import { Artikel } from '@/models/Artikel';
import { writeAuditLog } from '@/models/AuditLog';
import { KategoriArtikel } from '@/models/KategoriArtikel';

export const runtime = 'nodejs';

const schema = z
  .object({
    nama: z.string().trim().min(2).max(120).optional(),
    nama_en: z.string().trim().max(120).optional(),
    slug: z.string().trim().max(80).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus diisi',
  });

type RouteProps = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const perubahan = { ...parsed.data, updatedBy: guard.session.sub };
  if (parsed.data.slug !== undefined) {
    const slug = toSlug(parsed.data.slug);
    if (!slug) {
      return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 });
    }
    perubahan.slug = slug;
  }

  await connectDb();
  const before = await KategoriArtikel.findById(id).lean();
  if (!before) {
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  }
  if (
    perubahan.slug &&
    (await KategoriArtikel.exists({ slug: perubahan.slug, _id: { $ne: id } }))
  ) {
    return NextResponse.json({ error: 'Slug kategori sudah digunakan' }, { status: 409 });
  }

  const item = await KategoriArtikel.findByIdAndUpdate(id, perubahan, {
    new: true,
  }).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'KategoriArtikel',
    entitasId: id,
    ringkasan: `Ubah kategori artikel: ${item?.nama || id}`,
    before,
    after: item,
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest, props: RouteProps) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }

  await connectDb();
  const before = await KategoriArtikel.findById(id).lean();
  if (!before) {
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  }
  if (await Artikel.exists({ kategori_id: id })) {
    return NextResponse.json(
      { error: 'Kategori masih digunakan oleh artikel dan tidak dapat dihapus' },
      { status: 409 },
    );
  }

  const item = await KategoriArtikel.findByIdAndDelete(id).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'KategoriArtikel',
    entitasId: id,
    ringkasan: `Hapus kategori artikel: ${before.nama}`,
    before,
  });
  return NextResponse.json({ item });
}
