import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
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

const createSchema = z.object({
  programStudi_id: z.string().min(1),
  jalur_id: z.string().min(1),
  jadwal_id: z.string().min(1),
  kelas_id: z.string().optional(),
  biaya: z.number().min(0),
  biayaPerSemester: z.number().min(0).nullable().optional(),
  biayaTambahan: z.number().min(0).nullable().optional(),
  persentase: z.array(z.string().min(1)).optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await Biaya.find()
    .populate('programStudi_id', 'nama singkatan jenjang')
    .populate('jalur_id', 'nama')
    .populate('jadwal_id', 'judul tahun mulai selesai status')
    .populate('kelas_id', 'nama singkatan')
    .sort({ updatedAt: -1 })
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
  const persentase =
    parsed.data.persentase && parsed.data.persentase.length > 0
      ? parsed.data.persentase
      : ['100%'];
  const doc = await Biaya.create({
    ...parsed.data,
    kelas_id: parsed.data.kelas_id || null,
    persentase,
    createdBy: guard.session.sub,
    updatedBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'Biaya',
    entitasId: String(doc._id),
    ringkasan: `Buat biaya: ${doc.biaya}`,
    after: doc.toObject(),
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
