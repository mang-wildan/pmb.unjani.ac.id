import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { ProgramStudi } from '@/models/ProgramStudi';
import '@/models/Fakultas';
import '@/models/Jenjang';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';
import { removeFile } from '@/lib/fileStorage';

export const runtime = 'nodejs';

const createSchema = z.object({
  nama: z.string().min(2).max(120),
  singkatan: z.string().min(1).max(20),
  jenjang_id: z.string().min(1),
  fakultas_id: z.string().min(1),
  akreditasi: z.string().max(60).optional().default(''),
  persyaratan: z.array(z.string().max(300)).default([]),
  aktif: z.boolean().optional(),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await ProgramStudi.find()
    .populate('jenjang_id', 'nama singkatan')
    .populate('fakultas_id', 'nama singkatan')
    .sort({ nama: 1 })
    .lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const doc = await ProgramStudi.create({
    ...parsed.data,
    singkatan: parsed.data.singkatan.toUpperCase(),
    createdBy: guard.session.sub,
    updatedBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'ProgramStudi',
    entitasId: String(doc._id),
    ringkasan: `Buat program studi: ${doc.nama}`,
    after: doc.toObject(),
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;

  const body = await req.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }

  const ids = [...new Set(parsed.data.ids)];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  }

  await connectDb();
  const docs = await ProgramStudi.find({ _id: { $in: ids } }).lean();
  if (docs.length === 0) {
    return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  }

  await Promise.all(
    docs.map((doc) =>
      doc.fileAkreditasi?.filename ? removeFile(doc.fileAkreditasi.filename) : Promise.resolve()
    ),
  );

  await ProgramStudi.deleteMany({ _id: { $in: docs.map((doc) => doc._id) } });

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'ProgramStudi',
    entitasId: docs.length === 1 ? String(docs[0]._id) : 'bulk',
    ringkasan: `Hapus ${docs.length} program studi sekaligus`,
    before: docs,
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });

  return NextResponse.json({ ok: true, deletedCount: docs.length });
}
