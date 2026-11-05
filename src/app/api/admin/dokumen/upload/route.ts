import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Dokumen } from '@/models/Dokumen';
import { requireAdmin } from '@/lib/adminGuard';
import { ensureUploadDir, safeFilename, uploadDir, removeFile } from '@/lib/fileStorage';
import { writeAuditLog } from '@/models/AuditLog';

// PDF magic bytes: %PDF-
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
function isPdfBuffer(buf: Buffer): boolean {
  if (buf.length < PDF_MAGIC.length) return false;
  return buf.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
}

import { tolakBodyBesar, bacaFormData } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 15);

const metaSchema = z.object({
  kategori: z.enum(['biaya', 'manual-book', 'lainnya']),
  tahun: z.string().trim().min(4).max(20),
  judul: z.string().min(2).max(160),
  deskripsi: z.string().max(500).optional().default(''),
  urutan: z.coerce.number().int().min(0).max(9999).default(100),
  aktif: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .default(true),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  const ct = req.headers.get('content-type') || '';
  if (!ct.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type harus multipart/form-data' }, { status: 400 });
  }

  const terlaluBesar = tolakBodyBesar(req, MAX_MB);

  if (terlaluBesar) return terlaluBesar;

  const form = await bacaFormData(req);

  if (!form) return NextResponse.json({ error: 'Data unggahan tidak valid atau terpotong' }, { status: 400 });
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File melebihi ${MAX_MB} MB` }, { status: 400 });
  }

  const meta = metaSchema.safeParse({
    kategori: form.get('kategori'),
    tahun: form.get('tahun'),
    judul: form.get('judul'),
    deskripsi: form.get('deskripsi') || '',
    urutan: form.get('urutan') || 100,
    aktif: form.get('aktif') ?? true,
  });
  if (!meta.success) {
    return NextResponse.json({ error: 'Metadata tidak valid', details: meta.error.issues }, { status: 400 });
  }

  await ensureUploadDir();
  const filename = safeFilename(file.name || 'dokumen.pdf');
  const absolute = path.join(uploadDir(), filename);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolute, bytes);

  if (!isPdfBuffer(bytes)) {
    await fs.unlink(absolute).catch(() => void 0);
    return NextResponse.json({ error: 'Hanya file PDF yang diperbolehkan' }, { status: 400 });
  }

  await connectDb();
  try {
    const doc = await Dokumen.create({
      kategori: meta.data.kategori,
      tahun: meta.data.tahun,
      judul: meta.data.judul,
      deskripsi: meta.data.deskripsi,
      filename,
      originalName: file.name || filename,
      ukuranByte: file.size,
      mime: 'application/pdf',
      uploadedBy: guard.session.sub,
      urutan: meta.data.urutan,
      aktif: meta.data.aktif,
    });
    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'upload',
      entitas: 'Dokumen',
      entitasId: String(doc._id),
      ringkasan: `Unggah ${meta.data.kategori}: ${meta.data.judul}`,
      after: doc.toObject(),
    });
    return NextResponse.json({ item: doc }, { status: 201 });
  } catch (err) {
    await removeFile(filename);
    throw err;
  }
}
