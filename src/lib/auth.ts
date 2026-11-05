import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { NextRequest } from 'next/server';

// Modul ini hanya mengurus JWT dan cookie (dipakai juga oleh proxy), tanpa akses database.
// Verifikasi sesi aktif berbasis database ada di src/lib/session.ts.

const IS_PROD = process.env.NODE_ENV === 'production';

/** Cookie sesi admin. Prefix __Host- (Secure, Path=/, tanpa Domain) di production (FR-13). */
export const SESSION_COOKIE = IS_PROD ? '__Host-pmb_session' : 'pmb_session';
/** Cookie token pre-auth MFA: hanya berlaku untuk langkah kedua login (FR-07). */
export const MFA_COOKIE = IS_PROD ? '__Host-pmb_mfa' : 'pmb_mfa';
/** Nama cookie sebelum v1.4.0; hanya untuk dihapus dari browser. */
export const LEGACY_COOKIES = ['pmb_session', 'pmb_refresh'] as const;

const ISSUER = 'pmb-unjani';
const AUDIENCE_SESSION = 'pmb-admin';
const AUDIENCE_MFA = 'pmb-admin-mfa';

const ACCESS_TTL_SEC = 60 * 60; // 1 hour
const PREAUTH_TTL_SEC = 5 * 60; // 5 minutes

const ROLES = new Set(['superadmin', 'admin', 'editor']);

function secretKey(raw: string | undefined, name: string): Uint8Array {
  if (!raw || raw.length < 32) {
    throw new Error(`${name} must be set and at least 32 chars`);
  }
  return new TextEncoder().encode(raw);
}

export type SessionClaims = JWTPayload & {
  sub: string;
  email: string;
  role: 'superadmin' | 'admin' | 'editor';
  nama: string;
  /** Versi sesi akun saat token diterbitkan; harus sama dengan AdminUser.versiSesi (FR-11). */
  sv: number;
};

export type SessionInput = Pick<SessionClaims, 'sub' | 'email' | 'role' | 'nama' | 'sv'>;

export type PreAuthTahap = 'verifikasi' | 'daftar';

export type PreAuthClaims = JWTPayload & {
  sub: string;
  /** 'verifikasi' = MFA sudah aktif, minta kode; 'daftar' = MFA belum aktif, wajib mendaftar. */
  tahap: PreAuthTahap;
  sv: number;
  /** Waktu terbit dalam milidetik (iat hanya presisi detik); dipakai cek token hangus (FR-07). */
  tm: number;
};

function isVersi(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export async function signAccessToken(claims: SessionInput) {
  return new SignJWT({ email: claims.email, role: claims.role, nama: claims.nama, sv: claims.sv })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_SESSION)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(secretKey(process.env.JWT_SECRET, 'JWT_SECRET'));
}

/**
 * Verifikasi tanda tangan, penerbit, audiens, masa berlaku, dan bentuk klaim token sesi.
 * TIDAK memeriksa status akun di database: untuk otorisasi pakai getActiveSession/resolveActiveSession
 * di session.ts.
 */
export async function verifyAccessToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(process.env.JWT_SECRET, 'JWT_SECRET'), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE_SESSION,
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.nama !== 'string' ||
      typeof payload.role !== 'string' ||
      !ROLES.has(payload.role) ||
      !isVersi(payload.sv)
    ) {
      return null;
    }
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

export async function signPreAuthToken(claims: Pick<PreAuthClaims, 'sub' | 'tahap' | 'sv'>) {
  return new SignJWT({ tahap: claims.tahap, sv: claims.sv, tm: Date.now() })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_MFA)
    .setIssuedAt()
    .setExpirationTime(`${PREAUTH_TTL_SEC}s`)
    .sign(secretKey(process.env.JWT_SECRET, 'JWT_SECRET'));
}

/** Token pre-auth tidak pernah diterima sebagai sesi (audiens berbeda), dan sebaliknya. */
export async function verifyPreAuthToken(token: string): Promise<PreAuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(process.env.JWT_SECRET, 'JWT_SECRET'), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE_MFA,
    });
    if (
      typeof payload.sub !== 'string' ||
      (payload.tahap !== 'verifikasi' && payload.tahap !== 'daftar') ||
      !isVersi(payload.sv) ||
      typeof payload.tm !== 'number' ||
      !Number.isFinite(payload.tm)
    ) {
      return null;
    }
    return payload as PreAuthClaims;
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(SESSION_COOKIE)?.value;
}

export function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: IS_PROD,
    path: '/',
    maxAge: maxAgeSec,
  };
}

export const TTL = { access: ACCESS_TTL_SEC, preAuth: PREAUTH_TTL_SEC };
