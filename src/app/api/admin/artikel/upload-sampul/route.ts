import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fromBuffer } from 'file-type';
import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/adminGuard';
import { tolakBodyBesar, bacaFormData } from '@/lib/http';
import { connectDb } from '@/lib/db';
import { processPublicImage } from '@/lib/image';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/artikel');
const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 15);
const MIME_GAMBAR = new Set(['image/jpeg', 'image/png', 'image/webp']);

function safeFilename(original: string) {
  const base = path
    .basename(original, path.extname(original))
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'sampul';
  return `${base}-${randomUUID()}.webp`;
}

async function potongEnamBelasBandingSembilan(input: Buffer) {
  const normal = await sharp(input, {
    failOn: 'error',
    limitInputPixels: 40_000_000,
  })
    .rotate()
    .toBuffer();
  const metadata = await sharp(normal).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Dimensi gambar tidak terbaca');
  const rasio = 16 / 9;
  const width = Math.min(metadata.width, Math.floor(metadata.height * rasio));
  const height = Math.min(metadata.height, Math.floor(metadata.width / rasio));
  return sharp(normal)
    .extract({
      left: Math.floor((metadata.width - width) / 2),
      top: Math.floor((metadata.height - height) / 2),
      width,
      height,
    })
    .toBuffer();
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!(req.headers.get('content-type') || '').startsWith('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Content-Type harus multipart/form-data' },
      { status: 400 },
    );
  }

  let kegunaan = 'sampul';
  try {
    const terlaluBesar = tolakBodyBesar(req, MAX_MB);
    if (terlaluBesar) return terlaluBesar;
    const form = await bacaFormData(req);
    if (!form) return NextResponse.json({ error: 'Data unggahan tidak valid atau terpotong' }, { status: 400 });
    const file = form.get('file');
    kegunaan = form.get('kegunaan') === 'og' ? 'gambar OG' : 'sampul';
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 });
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File melebihi ${MAX_MB} MB` }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const jenis = await fromBuffer(bytes);
    if (!jenis || !MIME_GAMBAR.has(jenis.mime)) {
      return NextResponse.json(
        { error: 'Hanya JPEG, PNG, atau WebP yang diperbolehkan' },
        { status: 400 },
      );
    }

    const cropped = await potongEnamBelasBandingSembilan(bytes);
    const processed = await processPublicImage(cropped, {
      maxBytes: 300 * 1024,
      maxWidth: 1200,
      maxHeight: 675,
    });
    const filename = safeFilename(file.name || 'sampul');
    await connectDb();
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), processed.buffer);
    const url = `/uploads/artikel/${filename}`;

    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'upload',
      entitas: 'Artikel',
      entitasId: filename,
      ringkasan: `Unggah ${kegunaan} artikel: ${filename}`,
      after: { url, ukuranByte: processed.buffer.length, width: processed.width, height: processed.height },
    });
    return NextResponse.json(
      {
        item: {
          url,
          ukuranByte: processed.buffer.length,
          width: processed.width,
          height: processed.height,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[artikel-gambar] Gagal mengunggah gambar:', error);
    return NextResponse.json({ error: `Gagal mengunggah ${kegunaan}` }, { status: 500 });
  }
}
