import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { LRUCache } from 'lru-cache';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { getSettings } from '@/models/Settings';
import { writeAuditLog } from '@/models/AuditLog';
import {
  LEGACY_COOKIES,
  MFA_COOKIE,
  SESSION_COOKIE,
  TTL,
  cookieOptions,
  signAccessToken,
  signPreAuthToken,
  verifyPreAuthToken,
  type PreAuthClaims,
  type PreAuthTahap,
  type SessionClaims,
} from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { resetEmail, statusCaptcha } from '@/lib/loginAttempts';

// Bagian bersama alur login dua langkah (FR-01–FR-08): rate limit, token pre-auth MFA,
// dan penerbitan sesi. Dipakai /api/auth/login, /api/auth/mfa/verifikasi, dan /api/auth/mfa/daftar.
// Sesi admin HANYA diterbitkan lewat terbitkanSesi(), setelah langkah MFA selesai.

export const PESAN_LAYANAN = 'Layanan sedang tidak tersedia. Coba lagi sebentar.';
export const PESAN_PREAUTH_BERAKHIR = 'Langkah verifikasi sudah berakhir. Masuk ulang dengan email dan password.';

export function konteksLog(req: Request, ip: string) {
  return { ip, userAgent: (req.headers.get('user-agent') || '').slice(0, 300) };
}

/** Catat rate_limit sekali per kunci per jendela, agar banjir permintaan tidak membanjiri Log Aktivitas. */
const rateLimitTercatat = new LRUCache<string, true>({ max: 5000 });

/**
 * Rate limit per IP terpercaya (FR-24). Mengembalikan respons 429 bila terlampaui, atau null.
 * `nama` membedakan langkah (login / mfa) agar masing-masing punya jatah sendiri.
 */
export async function batasiPercobaan(req: Request, ip: string, nama: 'login' | 'mfa' | 'daftar') {
  const limit = Number(process.env.LOGIN_RATE_LIMIT || 5);
  const rl = rateLimit(`${nama}:${ip}`, limit, 60_000);
  if (rl.allowed) return null;
  const kunciLog = `${nama}:${ip}:${rl.resetAt}`;
  if (!rateLimitTercatat.has(kunciLog)) {
    rateLimitTercatat.set(kunciLog, true, { ttl: 120_000 });
    await connectDb()
      .then(() =>
        writeAuditLog({
          aksi: 'rate_limit',
          entitas: 'AdminUser',
          ringkasan: `Rate limit ${{ login: 'login', mfa: 'verifikasi MFA', daftar: 'pendaftaran MFA' }[nama]} tercapai (${limit}/menit per IP)`,
          ...konteksLog(req, ip),
        }),
      )
      .catch(() => null);
  }
  return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi sebentar.' }, { status: 429 });
}

/** Status reCAPTCHA dari Pengaturan: siteKey hanya bila aktif. */
export async function infoCaptcha(): Promise<{ aktif: boolean; siteKey: string; secretKey: string }> {
  const settings = await getSettings();
  const rc = settings.recaptcha as { aktif?: boolean; siteKey?: string; secretKey?: string } | undefined;
  const aktif = rc?.aktif === true;
  return { aktif, siteKey: aktif ? rc?.siteKey || '' : '', secretKey: rc?.secretKey || '' };
}

function hapusCookie(res: NextResponse, names: readonly string[]) {
  for (const name of names) res.cookies.set(name, '', { ...cookieOptions(0), maxAge: 0 });
}

/** Password benar: terbitkan token pre-auth (5 menit) di cookie terpisah. Belum ada sesi. */
export async function responsPreAuth(user: { _id: unknown; versiSesi?: number | null }, tahap: PreAuthTahap) {
  const token = await signPreAuthToken({ sub: String(user._id), tahap, sv: user.versiSesi ?? 0 });
  const res = NextResponse.json({ ok: true, tahap });
  res.cookies.set(MFA_COOKIE, token, cookieOptions(TTL.preAuth));
  // Login baru: sesi lama di browser ini (akun apa pun) tidak dipakai lagi.
  hapusCookie(res, [SESSION_COOKIE, ...LEGACY_COOKIES.filter((n) => n !== SESSION_COOKIE)]);
  return res;
}

/** Tolak langkah MFA dan kembalikan pengguna ke langkah email/password; cookie pre-auth dihapus. */
export function responsKembaliKePassword(
  error: string,
  status: number,
  captcha?: { wajib: boolean; siteKey: string } | null,
) {
  const wajib = Boolean(captcha?.wajib && captcha.siteKey);
  const res = NextResponse.json(
    { error, kembaliKePassword: true, captchaRequired: wajib, ...(wajib ? { siteKey: captcha!.siteKey } : {}) },
    { status },
  );
  hapusCookie(res, [MFA_COOKIE]);
  return res;
}

export type UserPreAuth = {
  _id: mongoose.Types.ObjectId;
  email: string;
  nama: string;
  role: SessionClaims['role'];
  aktif?: boolean | null;
  versiSesi?: number | null;
  mfaAktif?: boolean | null;
  mfaRahasia?: string | null;
  mfaPeriodeTerakhir?: number | null;
};

/**
 * Baca dan validasi token pre-auth dari cookie untuk tahap tertentu. Token ditolak bila tidak ada,
 * kedaluwarsa, tahapnya lain, akun tidak ada/nonaktif, versiSesi berubah (mis. MFA di-reset), atau
 * status MFA akun sudah tidak sesuai tahap. Melempar error bila database gagal.
 */
export async function bacaPreAuth(
  req: NextRequest,
  tahap: PreAuthTahap,
): Promise<{ klaim: PreAuthClaims; user: UserPreAuth } | null> {
  const token = req.cookies.get(MFA_COOKIE)?.value;
  if (!token) return null;
  const klaim = await verifyPreAuthToken(token);
  if (!klaim || klaim.tahap !== tahap || !mongoose.isValidObjectId(klaim.sub)) return null;
  await connectDb();
  const user = await AdminUser.findById(klaim.sub)
    .select('email nama role aktif versiSesi mfaAktif mfaPeriodeTerakhir +mfaRahasia')
    .lean<UserPreAuth>();
  if (!user || user.aktif !== true) return null;
  if ((user.versiSesi ?? 0) !== klaim.sv) return null;
  if (tahap === 'verifikasi' ? user.mfaAktif !== true : user.mfaAktif === true) return null;
  return { klaim, user };
}

/**
 * Token pre-auth masih boleh dipakai untuk menebak kode? Tidak, bila penghitung email/IP sudah
 * mencapai ambang DAN ada kegagalan baru sejak token terbit. Token bersifat stateless; tanpa cek
 * ini salinan token bisa dipakai menebak kode berulang kali selama 5 menit meski cookie dihapus.
 * Mengembalikan status captcha bila token harus ditolak, atau null bila boleh lanjut.
 */
export async function preAuthHangus(email: string, ip: string, klaim: PreAuthClaims) {
  const status = await statusCaptcha(email, ip);
  if (status.wajib && status.gagalTerakhir && status.gagalTerakhir.getTime() >= klaim.tm) return status;
  return null;
}

/**
 * Langkah terakhir login: reset penghitung email (FR-02), terbitkan sesi, catat login, hapus cookie
 * pre-auth. `body` tambahan ikut di respons (mis. kode pemulihan saat pendaftaran MFA).
 */
export async function terbitkanSesi(
  req: Request,
  ip: string,
  user: UserPreAuth,
  ringkasan: string,
  body: Record<string, unknown> = {},
) {
  await resetEmail(user.email).catch((error) => {
    console.error('[login] gagal mereset penghitung email:', error);
  });

  const access = await signAccessToken({
    sub: String(user._id),
    email: user.email,
    role: user.role,
    nama: user.nama,
    sv: user.versiSesi ?? 0,
  });
  await AdminUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await writeAuditLog({
    userId: user._id,
    email: user.email,
    aksi: 'login',
    entitas: 'AdminUser',
    entitasId: String(user._id),
    ringkasan,
    ...konteksLog(req, ip),
  });

  const res = NextResponse.json({
    ok: true,
    user: { id: String(user._id), email: user.email, nama: user.nama, role: user.role },
    ...body,
  });
  res.cookies.set(SESSION_COOKIE, access, cookieOptions(TTL.access));
  // Refresh token tidak lagi diterbitkan (FR-12); hapus cookie lama dan token pre-auth.
  hapusCookie(res, [MFA_COOKIE, ...LEGACY_COOKIES.filter((n) => n !== SESSION_COOKIE)]);
  return res;
}
