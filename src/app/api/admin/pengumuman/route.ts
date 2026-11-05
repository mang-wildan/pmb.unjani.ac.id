import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Pengumuman } from '@/models/Pengumuman';
import { requireAdmin } from '@/lib/adminGuard';
import { sanitizeRichText } from '@/lib/sanitize';
import { toSlug } from '@/lib/slug';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

const schema = z.object({
  judul: z.string().min(3).max(160),
  judul_en: z.string().max(160).optional().default(''),
  slug: z.string().trim().min(3).max(80).optional(),
  ringkasan: z.string().max(320).optional().default(''),
  ringkasan_en: z.string().max(320).optional().default(''),
  konten: z.string().max(50_000).optional().default(''),
  konten_en: z.string().max(50_000).optional().default(''),
  pinned: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
  aktif: z.boolean().default(true),
  metaTitle: z.string().max(120).optional().default(''),
  metaDescription: z.string().max(220).optional().default(''),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await Pengumuman.find().sort({ pinned: -1, publishedAt: -1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const slug = parsed.data.slug?.trim() || toSlug(parsed.data.judul);
  const exists = await Pengumuman.findOne({ slug });
  if (exists) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 });
  const doc = await Pengumuman.create({
    ...parsed.data,
    slug,
    konten: sanitizeRichText(parsed.data.konten),
    konten_en: sanitizeRichText(parsed.data.konten_en),
    publishedAt: parsed.data.publishedAt || new Date(),
    createdBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'Pengumuman',
    entitasId: String(doc._id),
    ringkasan: `Buat pengumuman: ${doc.judul}`,
    after: doc.toObject(),
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
