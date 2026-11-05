'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { ADMIN_NAV, type AdminRole, type NavItem } from '@/lib/permissions';

const ROLE_LABEL: Record<AdminRole, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
};

function NavIcon({ icon }: { icon: string }) {
  if (icon.startsWith('fa-')) {
    return <i className={cn(icon, 'text-base flex-none w-4 text-center')} aria-hidden />;
  }

  return <span className="text-sm font-semibold flex-none min-w-[16px] text-center" aria-hidden>{icon}</span>;
}

function canSeeItem(item: NavItem, role: AdminRole | null): boolean {
  if (item.children?.length) {
    return item.children.some((child) => canSeeItem(child, role));
  }
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

export default function Sidebar({
  user,
  open = false,
  onClose,
  collapsed = false,
  jumlahKritis = 0,
}: {
  user: { email: string; nama: string; role: AdminRole } | null;
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  /** Jumlah notifikasi Kritis; badge di menu Dashboard bila > 0 (FR-64). */
  jumlahKritis?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  const visibleItems = ADMIN_NAV.filter((item) => canSeeItem(item, user?.role ?? null));

  useEffect(() => {
    const nextState = Object.fromEntries(
      visibleItems
        .filter((item) => item.children?.length)
        .map((item) => [
          item.label,
          item.children!.some((child) => child.href && pathname.startsWith(child.href)),
        ]),
    );
    setOpenGroups((prev) => ({ ...nextState, ...prev }));
  }, [pathname]);

  return (
    <aside className={cn(
      'shrink-0 bg-white border-r border-brand-50 min-h-screen flex flex-col',
      'fixed inset-y-0 left-0 z-40 transition-all duration-300 md:relative md:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full',
      collapsed ? 'w-16' : 'w-64',
    )}>
      <div className={cn('sticky top-0 z-10 h-14 bg-white border-b border-brand-50 flex items-center justify-between', collapsed ? 'px-3 justify-center' : 'px-5')}>
        <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/logo-pmb-unjani (1).png"
            alt="Logo PMB UNJANI"
            width={40}
            height={40}
            className="h-10 w-auto object-contain flex-none"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-brand-700 leading-tight">PMB UNJANI</p>
              <p className="text-[11px] text-ink-muted uppercase tracking-wider">Admin Panel</p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted hover:bg-brand-50 flex-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            if (item.children?.length) {
              const children = item.children.filter((child) => canSeeItem(child, user?.role ?? null));
              const groupActive = children.some((child) => child.href && pathname.startsWith(child.href));
              const isOpen = collapsed ? true : openGroups[item.label] ?? groupActive;

              return (
                <li key={item.label}>
                  <button
                    type="button"
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      if (collapsed) return;
                      setOpenGroups((prev) => ({ ...prev, [item.label]: !isOpen }));
                    }}
                    className={cn(
                      'w-full flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition',
                      collapsed ? 'justify-center gap-0' : 'gap-3',
                      groupActive
                        ? 'bg-brand text-white shadow-soft'
                        : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
                    )}
                  >
                    <NavIcon icon={item.icon} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          aria-hidden
                          className={cn('transition-transform', isOpen && 'rotate-180')}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </>
                    )}
                  </button>
                  <ul className={cn('mt-1 space-y-1', collapsed ? 'pl-0' : 'pl-3', !isOpen && !collapsed && 'hidden')}>
                    {children.map((child) => {
                      const childActive = child.href ? pathname.startsWith(child.href) : false;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href!}
                            title={collapsed ? child.label : undefined}
                            className={cn(
                              'flex items-center rounded-xl px-3 py-2 text-sm transition',
                              collapsed ? 'justify-center' : 'gap-3',
                              childActive
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
                            )}
                          >
                            <NavIcon icon={child.icon} />
                            {!collapsed && child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            }

            const active = item.href === '/admin' ? pathname === '/admin' : Boolean(item.href && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    collapsed ? 'justify-center gap-0' : 'gap-3',
                    active
                      ? 'bg-brand text-white shadow-soft'
                      : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
                  )}
                >
                  <NavIcon icon={item.icon} />
                  {!collapsed && item.label}
                  {item.href === '/admin' && jumlahKritis > 0 && (
                    <span
                      className={cn(
                        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white',
                        collapsed ? 'ml-1' : 'ml-auto',
                      )}
                    >
                      {jumlahKritis}
                      <span className="sr-only"> notifikasi kritis</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-brand-50">
          {user && (
            <div className="mb-3 rounded-xl bg-brand-50/70 px-3 py-2.5">
              <p className="text-sm font-semibold text-ink truncate">{user.nama}</p>
              <p className="text-xs text-ink-muted truncate">{user.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-brand-700 font-bold mt-1">
                {ROLE_LABEL[user.role] ?? user.role}
              </p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full rounded-full border border-red-200 text-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      )}

      {collapsed && (
        <div className="p-2 border-t border-brand-50 flex justify-center">
          <button
            onClick={onLogout}
            title="Keluar"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
