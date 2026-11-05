'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminRole } from '@/lib/permissions';

const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
};

const ROLE_CLASS: Record<AdminRole, string> = {
  superadmin: 'bg-brand text-white',
  admin: 'bg-blue-100 text-blue-700',
  editor: 'bg-gray-100 text-gray-600',
};

type Props = {
  user: { nama: string; email: string; role: AdminRole } | null;
  onMenuClick: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function AdminTopbar({ user, onMenuClick, collapsed, onToggleCollapse }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initials = user?.nama
    ? user.nama.split(' ').slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : '?';

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-brand-50 flex items-center gap-3 px-4 md:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-brand-50 hover:text-brand-700 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Desktop collapse toggle */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
        className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-brand-50 hover:text-brand-700 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
          <path d="M11 19l-7-7 7-7" />
          <path d="M19 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="ml-auto flex items-center gap-3">
        {user && (
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-brand-50 transition-colors"
            >
              <span className={`hidden sm:inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${ROLE_CLASS[user.role]}`}>
                {ROLE_LABEL[user.role]}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white text-xs font-bold select-none flex-none">
                {initials}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden className={`text-ink-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-brand-50 shadow-[0_8px_30px_rgba(0,0,0,0.1)] py-2 z-50">
                <div className="px-4 py-2.5 border-b border-brand-50">
                  <p className="text-sm font-semibold text-ink truncate">{user.nama}</p>
                  <p className="text-xs text-ink-muted truncate">{user.email}</p>
                </div>
                <div className="py-1.5 px-2">
                  <Link
                    href="/admin/akun"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Akun Saya
                  </Link>
                  <button
                    onClick={onLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {loggingOut ? 'Keluar...' : 'Keluar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
