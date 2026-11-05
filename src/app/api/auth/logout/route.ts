import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  MFA_COOKIE,
  LEGACY_COOKIES,
  cookieOptions,
  verifyAccessToken,
} from '@/lib/auth';
import { writeAuditLog } from '@/models/AuditLog';
import { AdminUser } from '@/models/AdminUser';
import { connectDb } from '@/lib/db';
import { hasValidCsrfOrigin } from '@/lib/csrf';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Lapis kedua (proxy sudah memeriksa): cegah logout paksa lintas situs.
  if (!hasValidCsrfOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifyAccessToken(token) : null;
    if (session) {
      await connectDb();
      // Cabut sesi di server (FR-11): naikkan versiSesi sehingga token ini, dan salinannya,
      // tidak berlaku lagi. Hanya bila token masih versi terkini, agar token lama yang
      // dicuri tidak bisa dipakai untuk mengeluarkan sesi terbaru.
      const versi = session.sv === 0 ? { $in: [0, null] } : session.sv;
      await AdminUser.updateOne({ _id: session.sub, versiSesi: versi }, { $inc: { versiSesi: 1 } });
      await writeAuditLog({
        userId: session.sub,
        email: session.email,
        aksi: 'logout',
        entitas: 'AdminUser',
        entitasId: session.sub,
        ringkasan: 'Logout',
        ip: clientIpFromHeaders(req.headers),
      });
    }
  } catch (error) {
    // Cookie tetap dihapus; sesi di server belum tercabut bila DB gagal.
    console.error('[logout] gagal mencabut sesi di server:', error);
  }
  const res = NextResponse.json({ ok: true });
  for (const name of new Set<string>([SESSION_COOKIE, MFA_COOKIE, ...LEGACY_COOKIES])) {
    res.cookies.set(name, '', { ...cookieOptions(0), maxAge: 0 });
  }
  return res;
}
