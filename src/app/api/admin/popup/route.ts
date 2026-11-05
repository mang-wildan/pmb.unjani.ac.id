import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Popup } from '@/models/Popup';
import { requireAdmin } from '@/lib/adminGuard';
import { ensureUploadDir, uploadDir } from '@/lib/fileStorage';
import { processPublicImage } from '@/lib/image';
import { writeAuditLog } from '@/models/AuditLog';
import { urlHttpOpsional } from '@/lib/validation';

import { tolakBodyBesar, bacaFormData } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MB = 5;

// Image magic bytes
const SIGS: { mime: string; bytes: number[] }[] = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF, followed by WEBP at offset 8
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

function detectImageMime(buf: Buffer): string | null {
  for (const s of SIGS) {
    if (buf.length < s.bytes.length) continue;
    let match = true;
    for (let i = 0; i < s.bytes.length; i++) if (buf[i] !== s.bytes[i]) { match = false; break; }
    if (match) {
      if (s.mime === 'image/webp') {
        if (buf.length >= 12 && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
        continue;
      }
      return s.mime;
    }
  }
  return null;
}

const metaSchema = z.object({
  judul: z.string().min(2).max(160),
  alt: z.string().max(160).optional().default(''),
  url: urlHttpOpsional.optional().default(''),
  urutan: z.coerce.number().int().min(0).max(9999).default(100),
  hideForDays: z.coerce.number().int().min(0).max(365).default(1),
  durasiTampil: z.coerce.number().int().min(0).max(3600).default(5),
  aktif: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .default(true),
  tampilDari: z.string().optional(),
  tampilSampai: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await Popup.find().sort({ urutan: 1, createdAt: -1 }).lean();
  return NextResponse.json({ items });
}

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
    return NextResponse.json({ error: 'Gambar wajib diunggah' }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Gambar melebihi ${MAX_MB} MB` }, { status: 400 });
  }

  const meta = metaSchema.safeParse({
    judul: form.get('judul'),
    alt: form.get('alt') || '',
    url: form.get('url') || '',
    urutan: form.get('urutan') || 100,
    hideForDays: form.get('hideForDays') || 1,
    durasiTampil: form.get('durasiTampil') ?? 5,
    aktif: form.get('aktif') ?? true,
    tampilDari: form.get('tampilDari') || '',
    tampilSampai: form.get('tampilSampai') || '',
  });
  if (!meta.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: meta.error.issues }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectImageMime(bytes);
  if (!mime) {
    return NextResponse.json({ error: 'Format gambar tidak didukung (PNG/JPG/WebP/GIF)' }, { status: 400 });
  }

  // Simpan hasil olahan server (dimensi dibatasi, tanpa EXIF/GPS), bukan byte unggahan (FR-27).
  let diolah;
  try {
    diolah = await processPublicImage(bytes, { maxBytes: 1024 * 1024, maxWidth: 1600, maxHeight: 1600 });
  } catch (error) {
    console.error('[popup] gambar tidak dapat diproses:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Gambar tidak dapat diproses. Gunakan berkas gambar yang valid.' }, { status: 400 });
  }

  await ensureUploadDir('popup');
  const filename = `${randomUUID()}.${diolah.extension}`;
  const absolute = path.join(uploadDir('popup'), filename);
  await fs.writeFile(absolute, diolah.buffer);

  await connectDb();
  const doc = await Popup.create({
    judul: meta.data.judul,
    alt: meta.data.alt || meta.data.judul,
    url: meta.data.url,
    urutan: meta.data.urutan,
    hideForDays: meta.data.hideForDays,
    durasiTampil: meta.data.durasiTampil,
    aktif: meta.data.aktif,
    tampilDari: meta.data.tampilDari ? new Date(meta.data.tampilDari) : null,
    tampilSampai: meta.data.tampilSampai ? new Date(meta.data.tampilSampai) : null,
    gambarFilename: filename,
    gambarMime: diolah.mimeType,
    createdBy: guard.session.sub,
  });

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'Popup',
    entitasId: String(doc._id),
    ringkasan: `Buat popup: ${doc.judul}`,
    after: doc.toObject(),
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
