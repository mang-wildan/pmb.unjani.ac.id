import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { passwordBaru, pesanGalat } from '@/lib/passwordPolicy';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().max(160),
  nama: z.string().min(2).max(120),
  password: passwordBaru,
  role: z.enum(['superadmin', 'admin', 'editor']).default('editor'),
  aktif: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'superadmin');
  if ('error' in guard) return guard.error;
  await connectDb();
  const items = await AdminUser.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'superadmin');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: pesanGalat(parsed.error.issues), details: parsed.error.issues },
      { status: 400 },
    );
  }
  await connectDb();
  const exists = await AdminUser.findOne({ email: parsed.data.email.toLowerCase() });
  if (exists) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
  const passwordHash = await AdminUser.hashPassword(parsed.data.password);
  const doc = await AdminUser.create({
    email: parsed.data.email,
    nama: parsed.data.nama,
    role: parsed.data.role,
    aktif: parsed.data.aktif,
    passwordHash,
  });
  // Respons tanpa hash password dan tanpa field rahasia MFA (nilainya kosong pada akun baru, tetapi
  // tidak perlu dikirim; konsisten dengan daftar dan ubah yang tidak memuatnya).
  const { passwordHash: _hash, mfaRahasia: _rahasia, mfaKodePemulihan: _kode, ...safe } = doc.toObject();
  void _hash; void _rahasia; void _kode;
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'create',
    entitas: 'AdminUser',
    entitasId: String(doc._id),
    ringkasan: `Buat pengguna: ${doc.email}`,
  });
  return NextResponse.json({ item: safe }, { status: 201 });
}
