import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { Biaya } from '@/models/Biaya';
import '@/models/Jadwal';
import '@/models/JalurSeleksi';
import '@/models/Kelas';
import '@/models/ProgramStudi';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const updateSchema = z.object({
  programStudi_id: z.string().min(1).optional(),
  jalur_id: z.string().min(1).optional(),
  jadwal_id: z.string().min(1).optional(),
  kelas_id: z.string().optional().nullable(),
  biaya: z.number().min(0).optional(),
  biayaPerSemester: z.number().min(0).nullable().optional(),
  biayaTambahan: z.number().min(0).nullable().optional(),
  persentase: z.array(z.string().min(1)).optional(),
});

function badId() {
  return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const before = await Biaya.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  const currentJadwalId =
    before.jadwal_id && typeof before.jadwal_id === 'object' && 'toString' in before.jadwal_id
      ? before.jadwal_id.toString()
      : String(before.jadwal_id || '');
  const nextJadwalId = parsed.data.jadwal_id ?? currentJadwalId;
  if (!nextJadwalId) {
    return NextResponse.json({ error: 'Jadwal wajib diisi' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { ...parsed.data, updatedBy: guard.session.sub };
  if (parsed.data.kelas_id === '') patch.kelas_id = null;
  if (parsed.data.persentase !== undefined) {
    patch.persentase = parsed.data.persentase.length > 0 ? parsed.data.persentase : ['100%'];
  }
  const updated = await Biaya.findByIdAndUpdate(id, patch, { new: true })
    .populate('programStudi_id', 'nama singkatan jenjang')
    .populate('jalur_id', 'nama')
    .populate('jadwal_id', 'judul tahun')
    .populate('kelas_id', 'nama singkatan')
    .lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Biaya',
    entitasId: id,
    ringkasan: `Ubah biaya: ${updated?.biaya ?? id}`,
    before,
    after: updated,
    ip: clientIpFromHeaders(req.headers),
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectDb();
  const removed = await Biaya.findByIdAndDelete(id).lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'Biaya',
    entitasId: id,
    ringkasan: `Hapus biaya ID: ${id}`,
    before: removed,
    ip: clientIpFromHeaders(req.headers),
  });
  return NextResponse.json({ ok: true });
}
