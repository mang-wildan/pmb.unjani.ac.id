import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { ProgramStudi } from '@/models/ProgramStudi';
import { requireAdmin } from '@/lib/adminGuard';
import { ensureUploadDir, safeFilename, uploadDir, removeFile } from '@/lib/fileStorage';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders, tolakBodyBesar, bacaFormData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= PDF_MAGIC.length && buf.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
}

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 15);

function badId() {
  return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();

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

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isPdfBuffer(bytes)) {
    return NextResponse.json({ error: 'Hanya file PDF yang diperbolehkan' }, { status: 400 });
  }

  await connectDb();
  const prodi = await ProgramStudi.findById(id);
  if (!prodi) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  // Remove old file if exists
  if (prodi.fileAkreditasi?.filename) {
    await removeFile(prodi.fileAkreditasi.filename);
  }

  await ensureUploadDir();
  const filename = safeFilename(file.name || 'akreditasi.pdf');
  const absolute = path.join(uploadDir(), filename);
  await fs.writeFile(absolute, bytes);

  const before = prodi.toObject();
  prodi.fileAkreditasi = { filename, originalName: file.name || filename, ukuranByte: file.size };
  prodi.updatedBy = new mongoose.Types.ObjectId(guard.session.sub);
  await prodi.save();

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'ProgramStudi',
    entitasId: id,
    ringkasan: `Unggah file akreditasi: ${prodi.nama}`,
    before,
    after: prodi.toObject(),
    ip: clientIpFromHeaders(req.headers),
  });

  return NextResponse.json({ item: prodi });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();

  await connectDb();
  const prodi = await ProgramStudi.findById(id);
  if (!prodi) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  if (prodi.fileAkreditasi?.filename) {
    await removeFile(prodi.fileAkreditasi.filename);
  }

  const before = prodi.toObject();
  prodi.fileAkreditasi = { filename: '', originalName: '', ukuranByte: 0 };
  prodi.updatedBy = new mongoose.Types.ObjectId(guard.session.sub);
  await prodi.save();

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'ProgramStudi',
    entitasId: id,
    ringkasan: `Hapus file akreditasi: ${prodi.nama}`,
    before,
    after: prodi.toObject(),
    ip: clientIpFromHeaders(req.headers),
  });

  return NextResponse.json({ ok: true });
}
