import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, cookieOptions } from '@/lib/auth';
import { resolveActiveSession } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * Dipanggil layout admin saat cookie sesi ada tetapi sesinya sudah tidak aktif (dicabut, akun
 * nonaktif, versi sesi berubah). Menghapus cookie lalu mengarahkan ke halaman login, agar tidak
 * terjadi redirect berulang (FR-11 AC3). Cookie HANYA dihapus bila sesinya memang tidak aktif,
 * sehingga tautan ini tidak bisa dipakai pihak lain untuk mengeluarkan admin yang masih sah.
 */
export async function GET(req: NextRequest) {
  // Error DB dibiarkan naik (500): cookie tidak dihapus saat sesi tidak dapat diverifikasi.
  const aktif = await resolveActiveSession(req.cookies.get(SESSION_COOKIE)?.value);
  // Location relatif: aman di balik reverse proxy (host internal tidak bocor ke browser).
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: aktif ? '/admin' : '/admin/login?sesi=berakhir' },
  });
  if (!aktif) res.cookies.set(SESSION_COOKIE, '', { ...cookieOptions(0), maxAge: 0 });
  return res;
}
