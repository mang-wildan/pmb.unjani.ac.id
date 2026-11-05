import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';
import { resetMfaAkun } from '@/lib/resetMfa';

export const runtime = 'nodejs';

// Reset MFA oleh superadmin (FR-09): untuk admin yang kehilangan HP dan kode pemulihan.
// Sesi target berakhir seketika; login berikutnya wajib mendaftar MFA ulang.

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'superadmin');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  if (id === guard.session.sub) {
    // Superadmin yang kehilangan akses memakai superadmin lain atau scripts/reset-mfa.ts.
    return NextResponse.json(
      { error: 'Tidak dapat mereset MFA akun sendiri. Minta superadmin lain atau operator server.' },
      { status: 400 },
    );
  }

  await connectDb();
  const hasil = await resetMfaAkun({ _id: id });
  if (!hasil) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'mfa_reset',
    entitas: 'AdminUser',
    entitasId: id,
    ringkasan: `Reset MFA pengguna: ${hasil.email} (sesi dicabut)`,
    before: hasil.sebelum,
    after: { mfaAktif: false, sisaKodePemulihan: 0, sesiDicabut: true },
    ip: clientIpFromHeaders(req.headers),
    userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
  });
  return NextResponse.json({ ok: true });
}
