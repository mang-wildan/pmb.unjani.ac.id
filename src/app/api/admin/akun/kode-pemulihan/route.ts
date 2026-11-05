import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { writeAuditLog } from '@/models/AuditLog';
import { requireAdmin } from '@/lib/adminGuard';
import { clientIpFromHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rateLimit';
import { verifikasiTotp } from '@/lib/totp';
import { SecretCryptoError, dekripsiRahasia } from '@/lib/secretCrypto';
import { buatKodePemulihan } from '@/lib/recoveryCodes';
import { konteksLog } from '@/lib/alurLogin';

export const runtime = 'nodejs';

// Buat ulang kode pemulihan (FR-08): wajib kode TOTP yang valid dari aplikasi authenticator.
// Set lama langsung hangus. Kode polos hanya ada di respons ini.

const schema = z.object({ kode: z.string().min(1).max(16) });

const PESAN_FORMAT = 'Masukkan 6 digit kode dari aplikasi authenticator.';
const PESAN_SALAH = 'Kode salah atau sudah dipakai. Tunggu kode berikutnya di aplikasi authenticator lalu coba lagi.';
const PESAN_TERLALU_BANYAK = 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.';
const PESAN_RAHASIA = 'Verifikasi kode authenticator tidak dapat dilakukan saat ini. Hubungi administrator.';
const TANPA_CACHE = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' };

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const { session } = guard;

  // Pemegang sesi yang tercuri tidak boleh menebak kode TOTP: batas per akun, bukan hanya per IP.
  const rl = rateLimit(`kodepemulihan:${session.sub}`, 5, 15 * 60_000);
  if (!rl.allowed) return NextResponse.json({ error: PESAN_TERLALU_BANYAK }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const kode = parsed.success ? parsed.data.kode.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(kode)) return NextResponse.json({ error: PESAN_FORMAT }, { status: 400 });

  await connectDb();
  const ip = clientIpFromHeaders(req.headers);
  const user = await AdminUser.findById(session.sub)
    .select('email mfaAktif mfaPeriodeTerakhir +mfaRahasia')
    .lean();
  if (!user || user.mfaAktif !== true) {
    return NextResponse.json({ error: 'MFA belum aktif untuk akun ini.' }, { status: 409 });
  }

  const log = (aksi: string, ringkasan: string) =>
    writeAuditLog({
      userId: session.sub,
      email: user.email,
      aksi,
      entitas: 'AdminUser',
      entitasId: session.sub,
      ringkasan,
      ...konteksLog(req, ip),
    });

  let rahasia: string;
  try {
    if (!user.mfaRahasia) throw new SecretCryptoError('Rahasia MFA akun kosong padahal MFA aktif.');
    rahasia = dekripsiRahasia(user.mfaRahasia, session.sub);
  } catch (error) {
    if (!(error instanceof SecretCryptoError)) throw error;
    console.error('[akun] rahasia MFA tidak dapat dipakai:', error.message);
    return NextResponse.json({ error: PESAN_RAHASIA }, { status: 503 });
  }

  const hasil = verifikasiTotp({ rahasia, kode, periodeTerakhir: user.mfaPeriodeTerakhir });
  if (!hasil.ok) {
    await log('mfa_gagal', 'Buat ulang kode pemulihan: kode authenticator salah');
    return NextResponse.json({ error: PESAN_SALAH }, { status: 400 });
  }

  // Simpan periode secara atomik (kode yang sama tidak bisa dipakai dua kali), lalu ganti seluruh set.
  const pemulihan = buatKodePemulihan();
  const ganti = await AdminUser.updateOne(
    {
      _id: session.sub,
      mfaAktif: true,
      $or: [{ mfaPeriodeTerakhir: null }, { mfaPeriodeTerakhir: { $lt: hasil.periode } }],
    },
    { $set: { mfaPeriodeTerakhir: hasil.periode, mfaKodePemulihan: pemulihan.hash } },
  );
  if (ganti.modifiedCount !== 1) {
    await log('mfa_gagal', 'Buat ulang kode pemulihan: kode authenticator sudah dipakai');
    return NextResponse.json({ error: PESAN_SALAH }, { status: 400 });
  }

  await log('mfa_kode_pemulihan_dibuat', 'Kode pemulihan dibuat ulang; set lama hangus');
  return NextResponse.json({ ok: true, kodePemulihan: pemulihan.kode }, { headers: TANPA_CACHE });
}
