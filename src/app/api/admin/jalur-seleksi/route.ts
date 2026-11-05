import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { requireAdmin } from '@/lib/adminGuard';
import { sanitizeRichText } from '@/lib/sanitize';
import { toSlug } from '@/lib/slug';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const createSchema = z.object({
  nama: z.string().min(2).max(120),
  nama_en: z.string().max(120).optional().default(''),
  slug: z.string().trim().min(2).max(80).optional(),
  ringkasan: z.string().max(400).optional().default(''),
  ringkasan_en: z.string().max(400).optional().default(''),
  deskripsi: z.string().max(20000).optional().default(''),
  deskripsi_en: z.string().max(20000).optional().default(''),
  persyaratan: z.array(z.string().max(300)).default([]),
  urutan: z.number().int().min(0).max(9999).default(100),
  aktif: z.boolean().default(true),
  badge: z.string().max(30).optional().default(''),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await JalurSeleksi.find().sort({ urutan: 1, nama: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const slugFinal = parsed.data.slug?.trim() || toSlug(parsed.data.nama);
  const exists = await JalurSeleksi.findOne({ slug: slugFinal });
  if (exists) return NextResponse.json({ error: 'Slug sudah digunakan' }, { status: 409 });
  const doc = await JalurSeleksi.create({
    ...parsed.data,
    slug: slugFinal,
    deskripsi: sanitizeRichText(parsed.data.deskripsi),
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'JalurSeleksi',
    entitasId: String(doc._id),
    ringkasan: `Buat jalur: ${doc.nama}`,
    after: doc.toObject(),
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
