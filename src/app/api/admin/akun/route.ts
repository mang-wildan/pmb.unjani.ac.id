import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

// Info akun yang sedang login untuk halaman Akun Saya (FR-08, FR-10). Hanya status MFA dan
// jumlah kode pemulihan tersisa; rahasia TOTP dan hash kode pemulihan tidak pernah dikirim.

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const user = await AdminUser.findById(guard.session.sub)
    .select('email nama role mfaAktif mfaDiaktifkanPada lastLoginAt +mfaKodePemulihan')
    .lean();
  if (!user) return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
  return NextResponse.json(
    {
      akun: { email: user.email, nama: user.nama, role: user.role, lastLoginAt: user.lastLoginAt ?? null },
      mfa: {
        aktif: user.mfaAktif === true,
        diaktifkanPada: user.mfaDiaktifkanPada ?? null,
        sisaKodePemulihan: user.mfaKodePemulihan?.length ?? 0,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
