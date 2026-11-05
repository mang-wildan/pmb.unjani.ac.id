import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { FAQ } from '@/models/FAQ';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

const schema = z.object({
  pertanyaan: z.string().min(5).max(300),
  jawaban: z.string().min(5).max(2000),
  pertanyaan_en: z.string().max(300).optional().default(''),
  jawaban_en: z.string().max(2000).optional().default(''),
  kategori: z.enum(['Teknis', 'Biaya', 'Jadwal']),
  urutan: z.number().int().min(0).max(9999).default(100),
  aktif: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await FAQ.find().sort({ kategori: 1, urutan: 1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const doc = await FAQ.create({ ...parsed.data, createdBy: guard.session.sub });
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'FAQ',
    entitasId: String(doc._id),
    ringkasan: `Buat FAQ: ${doc.pertanyaan}`,
    after: doc.toObject(),
  });
  return NextResponse.json({ item: doc }, { status: 201 });
}
