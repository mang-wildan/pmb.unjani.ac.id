import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { PageContent } from '@/models/PageContent';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { urlHttp } from '@/lib/validation';

export const runtime = 'nodejs';

// Bentuk data per kunci (FR-22), diinventaris dari admin/halaman/page.tsx dan pembaca publik
// (heroData di (public)/page.tsx). Field tak dikenal atau bertipe salah ditolak.
const pathAtauUrl = z
  .string()
  .max(300)
  .refine((v) => /^\/(?!\/)\S*$/.test(v) || urlHttp.safeParse(v).success, {
    message: 'Gambar harus berupa path internal (/uploads/...) atau URL http(s)',
  });

const heroSchema = z
  .object({
    judul: z.string().max(200).optional(),
    subJudul: z.string().max(500).optional(),
    tahunAjaran: z.string().max(100).optional(),
    heroImages: z.array(pathAtauUrl).max(20).optional(),
  })
  .strict();

// about, kontak, footer belum punya editor maupun pembaca; hanya objek kosong yang diterima
// sampai bentuknya ditetapkan.
const kosongSchema = z.object({}).strict();

const dataPerKunci = { hero: heroSchema, about: kosongSchema, kontak: kosongSchema, footer: kosongSchema } as const;

const putSchema = z
  .object({
    kunci: z.enum(['hero', 'about', 'kontak', 'footer']),
    data: z.record(z.any()),
  })
  .superRefine((v, ctx) => {
    const hasil = dataPerKunci[v.kunci].safeParse(v.data);
    if (!hasil.success) {
      for (const issue of hasil.error.issues) {
        ctx.addIssue({ ...issue, path: ['data', ...issue.path] } as z.IssueData);
      }
    }
  });

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await PageContent.find().lean();
  return NextResponse.json({ items });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data tidak valid', details: parsed.error.issues }, { status: 400 });
  }
  await connectDb();
  const before = await PageContent.findOne({ kunci: parsed.data.kunci }).lean();
  const doc = await PageContent.findOneAndUpdate(
    { kunci: parsed.data.kunci },
    { kunci: parsed.data.kunci, data: parsed.data.data, updatedBy: guard.session.sub },
    { upsert: true, new: true },
  ).lean();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: before ? 'update' : 'create',
    entitas: 'PageContent',
    entitasId: parsed.data.kunci,
    ringkasan: `Ubah halaman: ${parsed.data.kunci}`,
    before,
    after: doc,
  });
  return NextResponse.json({ item: doc });
}
