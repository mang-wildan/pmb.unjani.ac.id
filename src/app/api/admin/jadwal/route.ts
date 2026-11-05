import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Jadwal } from '@/models/Jadwal';
import { ProgramStudi } from '@/models/ProgramStudi';
import { hitungCakupanBiaya } from '@/lib/notifikasi';
import { batasHari } from '@/lib/statusPeriode';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const createSchema = z.object({
  judul:   z.string().min(2).max(160),
  ke:      z.number().int().positive(),
  jalur:   z.array(z.string().min(1)).min(1, 'Minimal satu jalur harus dipilih'),
  mulai:   z.coerce.date(),
  selesai: z.coerce.date(),
  status:  z.boolean().default(true),
  tahun:   z.string().min(4).max(20),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await Jadwal.find()
    .populate('jalur', 'nama')
    .sort({ tahun: -1, mulai: 1 })
    .lean();
  // Cakupan biaya hanya untuk jadwal yang belum berakhir (tab Berjalan & akan datang, FR-69).
  const { awal } = batasHari(new Date());
  const idBelumArsip = items.filter((j) => j.selesai >= awal).map((j) => j._id);
  const [cakupan, totalProdi] = await Promise.all([
    hitungCakupanBiaya(idBelumArsip).catch(() => new Map<string, number>()),
    ProgramStudi.countDocuments().catch(() => 0),
  ]);
  return NextResponse.json({ items, cakupan: Object.fromEntries(cakupan), totalProdi });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.selesai < parsed.data.mulai) {
    return NextResponse.json({ error: 'Tanggal selesai harus setelah tanggal mulai' }, { status: 400 });
  }
  await connectDb();
  const doc = await Jadwal.create({
    ...parsed.data,
    createdBy: guard.session.sub,
    updatedBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'Jadwal',
    entitasId: String(doc._id),
    ringkasan: `Buat jadwal: ${doc.judul}`,
    after: doc.toObject(),
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
