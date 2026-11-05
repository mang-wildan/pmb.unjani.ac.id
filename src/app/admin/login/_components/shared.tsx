'use client';

// Bagian bersama langkah login MFA (FR-06–FR-08): pemanggil API, kotak pesan, dan tombol.

export type HasilKembali = { pesan: string; captchaRequired?: boolean; siteKey?: string };

export type JawabanApi = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

/** Panggil API auth; galat jaringan menjadi status 0 agar pemanggil cukup memeriksa satu bentuk. */
export async function panggilApi(url: string, init?: RequestInit): Promise<JawabanApi> {
  try {
    const res = await fetch(url, { cache: 'no-store', ...init });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Terjadi kesalahan jaringan. Periksa koneksi Anda.' } };
  }
}

/** Respons yang meminta pengguna kembali ke langkah email/password (token pre-auth berakhir/hangus). */
export function kembaliDari(j: JawabanApi): HasilKembali | null {
  if (j.data.kembaliKePassword !== true) return null;
  return {
    pesan: String(j.data.error || 'Masuk ulang dengan email dan password.'),
    captchaRequired: j.data.captchaRequired === true,
    siteKey: typeof j.data.siteKey === 'string' ? j.data.siteKey : undefined,
  };
}

export function PesanGalat({ pesan, id }: { pesan: string | null; id?: string }) {
  if (!pesan) return null;
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
    >
      <svg className="h-4 w-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-red-700">{pesan}</p>
    </div>
  );
}

export function PesanInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{children}</div>
  );
}

export function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function TombolUtama({
  loading,
  disabled,
  children,
  type = 'submit',
  onClick,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="relative w-full overflow-hidden rounded-full bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-all"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          Memproses...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function TombolTeks({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-brand hover:text-brand-600 underline-offset-4 hover:underline"
    >
      {children}
    </button>
  );
}

export const kelasInput =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition';

export const kelasLabel = 'block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2';

/** Salin teks ke clipboard; fallback textarea untuk browser tanpa Clipboard API. */
export async function salinTeks(teks: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = teks;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
