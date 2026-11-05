import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';
import { hasValidCsrfOrigin } from '@/lib/csrf';
import { minRoleForPath } from '@/lib/permissions';
import { atLeast, type Role } from '@/lib/rbac';
import { resolveActiveSession, SessionUnavailableError, type ActiveSession } from '@/lib/session';
import { clientIpFromHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rateLimit';
import { writeAuditLog } from '@/models/AuditLog';

const ROLE_ORDER: Record<Role, number> = { editor: 1, admin: 2, superadmin: 3 };

function higherRole(a: Role, b: Role): Role {
  return ROLE_ORDER[a] >= ROLE_ORDER[b] ? a : b;
}

/**
 * Catat penolakan akses ke Log Aktivitas (FR-29). Dibatasi 10 entri/menit/IP agar permintaan
 * bertubi-tubi tidak membanjiri koleksi log.
 */
async function catatPenolakan(
  req: NextRequest,
  aksi: 'akses_ditolak' | 'csrf_ditolak',
  ringkasan: string,
  session?: ActiveSession | null,
) {
  const ip = clientIpFromHeaders(req.headers);
  if (!rateLimit(`tolak:${ip}`, 10, 60_000).allowed) return;
  await writeAuditLog({
    userId: session?.sub,
    email: session?.email ?? '',
    aksi,
    entitas: 'Akses',
    entitasId: req.nextUrl.pathname,
    ringkasan,
    after: { metode: req.method, path: req.nextUrl.pathname },
    ip,
    userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
  });
}

/**
 * Guard handler API admin (lapis kedua setelah proxy, FR-11 & FR-14):
 * 1. sesi aktif dari database (akun aktif, versi sesi cocok, role dari DB);
 * 2. cek CSRF Origin/Referer untuk POST/PUT/PATCH/DELETE;
 * 3. peran minimum = yang lebih tinggi antara `minRole` dan peta izin untuk path request,
 *    sehingga handler tidak bisa lebih longgar dari proxy.
 */
export async function requireAdmin(
  req: NextRequest,
  minRole: Role = 'editor',
): Promise<{ session: ActiveSession } | { error: NextResponse }> {
  let session: ActiveSession | null;
  try {
    session = await resolveActiveSession(req.cookies.get(SESSION_COOKIE)?.value);
  } catch (error) {
    if (error instanceof SessionUnavailableError) {
      console.error('[adminGuard]', error.message, error.cause);
      return {
        error: NextResponse.json(
          { error: 'Layanan sedang tidak tersedia. Coba lagi sebentar.' },
          { status: 503 },
        ),
      };
    }
    throw error;
  }
  if (!session) {
    // Hanya token yang ADA tetapi tidak valid/dicabut yang dicatat; tanpa cookie = bukan kejadian.
    if (req.cookies.get(SESSION_COOKIE)?.value) {
      await catatPenolakan(req, 'akses_ditolak', `401 ${req.method} ${req.nextUrl.pathname}: sesi tidak valid atau dicabut`);
    }
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!hasValidCsrfOrigin(req)) {
    await catatPenolakan(req, 'csrf_ditolak', `CSRF ditolak ${req.method} ${req.nextUrl.pathname}`, session);
    return { error: NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }) };
  }
  const required = higherRole(minRole, minRoleForPath(req.nextUrl.pathname));
  if (!atLeast(session, required)) {
    await catatPenolakan(
      req,
      'akses_ditolak',
      `403 ${req.method} ${req.nextUrl.pathname}: peran ${session.role} kurang dari ${required}`,
      session,
    );
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}
