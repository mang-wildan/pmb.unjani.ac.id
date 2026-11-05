import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Jenjang } from '@/models/Jenjang';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

const createSchema = z.object({
  nama: z.string().min(2).max(120),
  singkatan: z.string().min(1).max(20),
  warna: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await Jenjang.find().sort({ singkatan: 1 }).lean();
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
  const doc = await Jenjang.create({
    ...parsed.data,
    singkatan: parsed.data.singkatan.toUpperCase(),
    createdBy: guard.session.sub,
    updatedBy: guard.session.sub,
  });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'Jenjang',
    entitasId: String(doc._id),
    ringkasan: `Buat jenjang: ${doc.nama} (${doc.singkatan})`,
    after: doc.toObject(),
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
