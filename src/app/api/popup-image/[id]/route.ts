import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Popup } from '@/models/Popup';
import { uploadDir } from '@/lib/fileStorage';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }
  await connectDb();
  const doc = await Popup.findById(id).lean();
  if (!doc || !doc.aktif) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const abs = path.join(uploadDir('popup'), path.basename(doc.gambarFilename));
  try {
    await fs.access(abs);
  } catch {
    return NextResponse.json({ error: 'File hilang' }, { status: 410 });
  }
  const stat = await fs.stat(abs);
  const stream = createReadStream(abs);
  const web = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk as Buffer));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });
  return new Response(web, {
    headers: {
      'Content-Type': doc.gambarMime || 'image/jpeg',
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
