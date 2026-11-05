import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { promises as fs, createReadStream } from 'node:fs';
import { connectDb } from '@/lib/db';
import { Dokumen } from '@/models/Dokumen';
import { absolutePathOf } from '@/lib/fileStorage';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }
  await connectDb();
  const doc = await Dokumen.findById(id).lean();
  if (!doc || !doc.aktif) {
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  }
  const abs = absolutePathOf(doc.filename);
  try {
    await fs.access(abs);
  } catch {
    return NextResponse.json({ error: 'File hilang' }, { status: 410 });
  }

  const download = new URL(req.url).searchParams.get('download');
  const safeName = (doc.originalName || doc.filename).replace(/[^\w.\- ]+/g, '_');
  const disposition = `${download ? 'attachment' : 'inline'}; filename="${safeName}"`;

  const stream = createReadStream(abs);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk as Buffer));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Content-Length': String(doc.ukuranByte),
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
