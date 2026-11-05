import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/adminGuard';
import { processPublicImage } from '@/lib/image';

import { clientIpFromHeaders, tolakBodyBesar, bacaFormData } from '@/lib/http';
import { writeAuditLog } from '@/models/AuditLog';
export const runtime = 'nodejs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/content');
const MAX_MB = 5;

const IMAGE_MAGIC = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  png:  Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

function isValidImage(buf: Buffer): { valid: boolean } {
  if (buf.length < 12) return { valid: false };
  if (buf.subarray(0, 3).equals(IMAGE_MAGIC.jpeg)) return { valid: true };
  if (buf.subarray(0, 4).equals(IMAGE_MAGIC.png))  return { valid: true };
  if (buf.subarray(0, 4).equals(IMAGE_MAGIC.webp) && buf.subarray(8, 12).toString() === 'WEBP')
    return { valid: true };
  return { valid: false };
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  const ct = req.headers.get('content-type') || '';
  if (!ct.startsWith('multipart/form-data'))
    return NextResponse.json({ error: 'Content-Type harus multipart/form-data' }, { status: 400 });

  try {
    const terlaluBesar = tolakBodyBesar(req, MAX_MB);
    if (terlaluBesar) return terlaluBesar;
    const form = await bacaFormData(req);
    if (!form) return NextResponse.json({ error: 'Data unggahan tidak valid atau terpotong' }, { status: 400 });
    const file = form.get('file');
    if (!(file instanceof File))
      return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 });
    if (file.size > MAX_MB * 1024 * 1024)
      return NextResponse.json({ error: `File melebihi ${MAX_MB} MB` }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!isValidImage(bytes).valid)
      return NextResponse.json({ error: 'Hanya JPEG, PNG, atau WebP yang diperbolehkan' }, { status: 400 });

    // Simpan hasil olahan server (dimensi dibatasi, tanpa EXIF/GPS), bukan byte unggahan (FR-27).
    let diolah;
    try {
      diolah = await processPublicImage(bytes, { maxBytes: 1024 * 1024, maxWidth: 1920, maxHeight: 1920 });
    } catch (error) {
      console.error('[upload-image] gambar tidak dapat diproses:', error instanceof Error ? error.name : 'unknown');
      return NextResponse.json({ error: 'Gambar tidak dapat diproses. Gunakan berkas gambar yang valid.' }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.${diolah.extension}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), diolah.buffer);

    const url = `/uploads/content/${filename}`;
    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'upload',
      entitas: 'KontenGambar',
      entitasId: filename,
      ringkasan: `Upload gambar konten: ${filename}`,
      after: { url, ukuranByte: diolah.buffer.length, width: diolah.width, height: diolah.height },
      ip: clientIpFromHeaders(req.headers),
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
    });
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    console.error('Content image upload error:', err);
    return NextResponse.json({ error: 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
