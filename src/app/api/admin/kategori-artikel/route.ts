import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { toSlug } from '@/lib/slug';
import { writeAuditLog } from '@/models/AuditLog';
import { KategoriArtikel } from '@/models/KategoriArtikel';

export const runtime = 'nodejs';

const schema = z.object({
  nama: z.string().trim().min(2).max(120),
  nama_en: z.string().trim().max(120).optional().default(''),
  slug: z.string().trim().max(80).optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await KategoriArtikel.find().sort({ nama: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const slug = toSlug(parsed.data.slug || parsed.data.nama);
  if (!slug) {
    return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 });
  }

  await connectDb();
  if (await KategoriArtikel.exists({ slug })) {
    return NextResponse.json({ error: 'Slug kategori sudah digunakan' }, { status: 409 });
  }

  const item = await KategoriArtikel.create({
    ...parsed.data,
    slug,
    createdBy: guard.session.sub,
    updatedBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'KategoriArtikel',
    entitasId: String(item._id),
    ringkasan: `Buat kategori artikel: ${item.nama}`,
    after: item.toObject(),
  });
  return NextResponse.json({ item }, { status: 201 });
}
