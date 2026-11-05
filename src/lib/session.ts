import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { SESSION_COOKIE, verifyAccessToken, type SessionClaims } from '@/lib/auth';

// Verifikasi sesi aktif berbasis database (FR-11). Server saja: jangan diimpor oleh proxy
// atau komponen klien.

/**
 * Wajibkan MFA aktif untuk setiap sesi (FR-06). Sesi hanya terbit setelah langkah MFA
 * (src/lib/alurLogin.ts); cek ini menolak token lama yang terbit sebelum MFA diwajibkan.
 */
export const MFA_WAJIB = true;

/** Database tidak dapat dihubungi saat memverifikasi sesi. Ditangani sebagai 503, bukan lolos. */
export class SessionUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Sesi tidak dapat diverifikasi: database tidak tersedia');
    this.name = 'SessionUnavailableError';
    this.cause = cause;
  }
}

/** Sesi yang lolos verifikasi; role, email, dan nama diambil dari database, bukan dari token. */
export type ActiveSession = SessionClaims;

/**
 * Sesi dianggap aktif hanya bila: JWT valid (penerbit, audiens, masa berlaku), akun ada dan aktif,
 * versi sesi pada token sama dengan AdminUser.versiSesi, dan (bila MFA_WAJIB) MFA sudah aktif.
 * Mengembalikan null bila ditolak; melempar SessionUnavailableError bila database gagal.
 */
export async function resolveActiveSession(token: string | undefined): Promise<ActiveSession | null> {
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  if (!claims || !mongoose.isValidObjectId(claims.sub)) return null;

  let user: {
    email: string;
    nama: string;
    role: SessionClaims['role'];
    aktif?: boolean | null;
    versiSesi?: number | null;
    mfaAktif?: boolean | null;
  } | null;
  try {
    await connectDb();
    user = await AdminUser.findById(claims.sub)
      .select('email nama role aktif versiSesi mfaAktif')
      .lean();
  } catch (error) {
    throw new SessionUnavailableError(error);
  }

  if (!user || user.aktif !== true) return null;
  if ((user.versiSesi ?? 0) !== claims.sv) return null;
  if (MFA_WAJIB && user.mfaAktif !== true) return null;

  return { ...claims, email: user.email, nama: user.nama, role: user.role };
}

/** Sesi aktif dari cookie request saat ini (Server Component / route handler). */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const c = await cookies();
  return resolveActiveSession(c.get(SESSION_COOKIE)?.value);
}
