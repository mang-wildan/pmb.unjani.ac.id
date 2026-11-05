import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/hero');
const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp)$/i;
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(
  _req: Request,
  props: { params: Promise<{ filename: string }> },
) {
  const { filename } = await props.params;
  if (!SAFE_FILENAME.test(filename) || path.basename(filename) !== filename) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }

  const filepath = path.resolve(UPLOAD_DIR, filename);
  if (!filepath.startsWith(`${UPLOAD_DIR}${path.sep}`)) {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
  }

  try {
    const data = await fs.readFile(filepath);
    const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()];
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 });
    }
    console.error('[hero-image] Gagal membaca gambar:', error);
    return NextResponse.json({ error: 'Gagal membaca gambar' }, { status: 500 });
  }
}
