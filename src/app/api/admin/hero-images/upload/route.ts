import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs, constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/adminGuard';
import { clientIpFromHeaders, tolakBodyBesar } from '@/lib/http';
import { writeAuditLog } from '@/models/AuditLog';
import { processPublicImage } from '@/lib/image';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/hero');
const MAX_MB = 10;

const IMAGE_MAGIC = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

function isValidImage(buf: Buffer): { valid: boolean; ext?: string } {
  if (buf.length < 12) return { valid: false };
  if (buf.subarray(0, 3).equals(IMAGE_MAGIC.jpeg)) return { valid: true, ext: 'jpg' };
  if (buf.subarray(0, 4).equals(IMAGE_MAGIC.png)) return { valid: true, ext: 'png' };
  if (buf.subarray(0, 4).equals(IMAGE_MAGIC.webp) && buf.subarray(8, 12).toString() === 'WEBP') {
    return { valid: true, ext: 'webp' };
  }
  return { valid: false };
}

function safeFilename(original: string, ext: string): string {
  const base = path
    .basename(original, path.extname(original))
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'hero';
  return `${base}-${randomUUID()}.${ext}`;
}

async function ensureUploadDir(): Promise<void> {
  // Let errors propagate — swallowing them hides permission failures on Linux servers
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.access(UPLOAD_DIR, fsConstants.W_OK);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  try {
    const terlaluBesar = tolakBodyBesar(req, MAX_MB);
    if (terlaluBesar) return terlaluBesar;
    let form: FormData;
    try {
      form = await req.formData();
    } catch (parseErr: any) {
      console.error('[hero-upload] gagal membaca form data:', parseErr?.name);
      return NextResponse.json({ error: 'Gagal membaca data unggahan' }, { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 });
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Ukuran file melebihi batas ${MAX_MB} MB` },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imgCheck = isValidImage(bytes);
    if (!imgCheck.valid) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.' },
        { status: 400 }
      );
    }

    let processedImage;
    try {
      processedImage = await processPublicImage(bytes);
    } catch (processErr: any) {
      console.error('[hero-upload] gambar tidak dapat diproses:', processErr?.name);
      return NextResponse.json({ error: 'Gambar tidak dapat diproses. Gunakan berkas gambar yang valid.' }, { status: 400 });
    }

    try {
      await ensureUploadDir();
    } catch (dirErr: any) {
      const code: string = dirErr.code ?? '';
      console.error('[hero-upload] ensureUploadDir failed:', {
        code,
        message: dirErr.message,
        uploadDir: UPLOAD_DIR,
        cwd: process.cwd(),
      });
      if (code === 'EACCES' || code === 'EPERM') {
        return NextResponse.json(
          { error: 'Server tidak dapat menyimpan berkas. Hubungi administrator server.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'Gagal mempersiapkan penyimpanan. Hubungi administrator server.' }, { status: 500 });
    }

    const filename = safeFilename(file.name || 'hero', processedImage.extension);
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
      await fs.writeFile(filepath, processedImage.buffer);
    } catch (writeErr: any) {
      const code: string = writeErr.code ?? '';
      console.error('[hero-upload] writeFile failed:', {
        code,
        message: writeErr.message,
        filepath,
        uploadDir: UPLOAD_DIR,
        cwd: process.cwd(),
      });
      if (code === 'EACCES' || code === 'EPERM') {
        return NextResponse.json(
          { error: 'Server tidak dapat menyimpan berkas. Hubungi administrator server.' },
          { status: 500 }
        );
      }
      if (code === 'ENOSPC') {
        return NextResponse.json(
          { error: 'Disk server penuh. Hubungi administrator.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: 'Gagal menyimpan berkas. Hubungi administrator server.' }, { status: 500 });
    }

    const url = `/uploads/hero/${filename}`;
    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'upload',
      entitas: 'HeroImage',
      entitasId: filename,
      ringkasan: `Upload gambar hero: ${filename}`,
      after: { url, ukuranByte: processedImage.buffer.length, width: processedImage.width, height: processedImage.height },
      ip: clientIpFromHeaders(req.headers),
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
    });
    return NextResponse.json({ url }, { status: 201 });
  } catch (err: any) {
    console.error('[hero-upload] Unexpected error:', {
      message: err.message,
      code: err.code,
      uploadDir: UPLOAD_DIR,
      cwd: process.cwd(),
    });
    return NextResponse.json({ error: 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
