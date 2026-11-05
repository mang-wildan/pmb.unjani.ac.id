import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from '@/lib/auth';
import { getActiveSession } from '@/lib/session';
import AdminShell from '@/components/admin/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Sesi diverifikasi ke database (akun aktif, versi sesi). Error DB dibiarkan naik ke error
  // boundary, bukan dianggap login: sesi tidak dicabut hanya karena DB sedang gangguan.
  const session = await getActiveSession();
  if (!session) {
    // Cookie ada tetapi sesi tidak aktif (dicabut/nonaktif): bersihkan cookie lalu ke login.
    const c = await cookies();
    if (c.get(SESSION_COOKIE)?.value) redirect('/api/auth/sesi-berakhir');
    return <>{children}</>;
  }
  const user = { email: session.email, nama: session.nama, role: session.role };
  // Pengenal sesi login ini (FR-63): login baru menerbitkan token baru dengan `iat` baru, sehingga
  // kunci berganti per login. Hanya id pengguna dan waktu terbit; tidak memuat rahasia.
  const kunciSesi = `${session.sub}:${session.iat ?? 0}`;
  return (
    <div className="flex min-h-screen bg-brand-50/30">
      <AdminShell user={user} kunciSesi={kunciSesi}>{children}</AdminShell>
    </div>
  );
}
