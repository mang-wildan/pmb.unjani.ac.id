import mongoose from 'mongoose';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/adminGuard';
import { connectDb } from '@/lib/db';
import { sanitizeRichText } from '@/lib/sanitize';
import { toSlug } from '@/lib/slug';
import { Artikel } from '@/models/Artikel';
import '@/models/AdminUser';
import { writeAuditLog } from '@/models/AuditLog';
import { KategoriArtikel } from '@/models/KategoriArtikel';

export const runtime = 'nodejs';

const statusSchema = z.enum(['draft', 'terjadwal', 'terbit', 'arsip']);

const listSchema = z.object({
  status: statusSchema.optional(),
  deleted: z.enum(['true', 'false']).optional().default('false'),
});

const createSchema = z
  .object({
    judul: z.string().trim().min(3).max(160),
    judul_en: z.string().trim().max(160).optional().default(''),
    isi: z.string().min(1).max(100_000),
    isi_en: z.string().max(100_000).optional().default(''),
    coverImage: z.string().trim().max(500).optional().default(''),
    status: statusSchema.optional().default('draft'),
    publishedAt: z.coerce.date().nullable().optional().default(null),
    pinned: z.boolean().optional().default(false),
    kategori_id: z.string().refine((value) => mongoose.isValidObjectId(value), {
      message: 'Kategori tidak valid',
    }),
    tags: z
      .array(z.string().trim().max(60))
      .max(30)
      .optional()
      .default([])
      .transform((items) => [...new Set(items.filter(Boolean))]),
    metaTitle: z.string().trim().max(120).optional().default(''),
    metaDescription: z.string().trim().max(220).optional().default(''),
    ogImage: z.string().trim().max(500).optional().default(''),
  })
  .superRefine((data, context) => {
    if (data.status !== 'draft' && !data.coverImage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['coverImage'],
        message: 'Sampul wajib diisi sebelum artikel diterbitkan',
      });
    }
    if ((data.status === 'terjadwal' || data.status === 'terbit') && !data.publishedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishedAt'],
        message: 'Waktu tayang wajib diisi',
      });
    }
    if (data.status === 'terjadwal' && data.publishedAt && data.publishedAt <= new Date()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishedAt'],
        message: 'Waktu tayang terjadwal harus berada di masa depan',
      });
    }
  });

function tanpaGambarSisipan(input: string) {
  return sanitizeRichText(input).replace(/<img\b[^>]*>/gi, '');
}

async function buatSlugUnik(judul: string) {
  const dasar = toSlug(judul) || 'artikel';
  let nomor = 1;
  while (nomor < 10_000) {
    const akhiran = nomor === 1 ? '' : `-${nomor}`;
    const slug = `${dasar.slice(0, 80 - akhiran.length)}${akhiran}`;
    if (!(await Artikel.exists({ slug }))) return slug;
    nomor += 1;
  }
  throw new Error('Tidak dapat membuat slug unik');
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const parsed = listSchema.safeParse({
    status: req.nextUrl.searchParams.get('status') || undefined,
    deleted: req.nextUrl.searchParams.get('deleted') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await connectDb();
  const terhapus = parsed.data.deleted === 'true';
  const filter: Record<string, unknown> = {
    deletedAt: terhapus ? { $ne: null } : null,
  };
  if (parsed.data.status) filter.status = parsed.data.status;
  if (terhapus && guard.session.role === 'editor') filter.createdBy = guard.session.sub;

  const items = await Artikel.find(filter)
    .populate('kategori_id', 'nama nama_en slug')
    .populate('createdBy', 'nama')
    .sort(terhapus ? { deletedAt: -1 } : { pinned: -1, publishedAt: -1, createdAt: -1 })
    .lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.issues },
      { status: 400 },
    );
  }

  await connectDb();
  if (!(await KategoriArtikel.exists({ _id: parsed.data.kategori_id }))) {
    return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 400 });
  }
  const slug = await buatSlugUnik(parsed.data.judul);
  const doc = await Artikel.create({
    ...parsed.data,
    slug,
    isi: tanpaGambarSisipan(parsed.data.isi),
    isi_en: tanpaGambarSisipan(parsed.data.isi_en),
    createdBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'Artikel',
    entitasId: String(doc._id),
    ringkasan: `Buat artikel: ${doc.judul}`,
    after: doc.toObject(),
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
