'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import AdminTopbar from './AdminTopbar';
import NotifikasiLogin from './NotifikasiLogin';
import type { AdminRole } from '@/lib/permissions';
import type { ButirNotifikasi } from '@/lib/notifikasi';

// Penanda "modal notifikasi sudah dilihat" per sesi login (FR-63). Nilainya kunciSesi.
const KUNCI_DILIHAT = 'pmb-notifikasi-dilihat';

type Props = {
  user: { email: string; nama: string; role: AdminRole } | null;
  /** Pengenal sesi login (sub:iat); penanda "modal sudah dilihat" per sesi (FR-63). */
  kunciSesi?: string;
  children: React.ReactNode;
};

export default function AdminShell({ user, kunciSesi, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState<ButirNotifikasi[] | null>(null);
  const [jumlahKritis, setJumlahKritis] = useState(0);

  // Muat notifikasi sekali per pemuatan penuh (layout tidak dirender ulang saat pindah halaman).
  // Kegagalan apa pun diabaikan: halaman admin tetap tampil tanpa modal.
  useEffect(() => {
    if (!user || !kunciSesi) return;
    let batal = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/stats/notifikasi', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: ButirNotifikasi[] };
        const items = data.items ?? [];
        if (batal) return;
        const kritis = items.filter((b) => b.tingkat === 'kritis').length;
        setJumlahKritis(kritis);
        if (kritis === 0) return;
        // Storage bisa diblokir: tanpa penanda, modal tampil di setiap pemuatan penuh (SRS 7.6).
        try {
          if (window.localStorage.getItem(KUNCI_DILIHAT) === kunciSesi) return;
          window.localStorage.setItem(KUNCI_DILIHAT, kunciSesi);
        } catch {
          /* diabaikan */
        }
        setModal(items.filter((b) => b.tingkat !== 'info'));
      } catch {
        /* diabaikan */
      }
    })();
    return () => {
      batal = true;
    };
  }, [user, kunciSesi]);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        jumlahKritis={jumlahKritis}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <div className="p-6 md:p-10">{children}</div>
      </div>
      {modal && user && <NotifikasiLogin butir={modal} nama={user.nama} onTutup={() => setModal(null)} />}
    </>
  );
}
