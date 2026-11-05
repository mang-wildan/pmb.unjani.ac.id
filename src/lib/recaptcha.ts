// Verifikasi reCAPTCHA v2 yang fail-closed (FR-04, SEC-10). Tidak pernah melempar error dan tidak
// pernah mencatat token atau secret ke log.

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TIMEOUT_MS = 5000;
const TOKEN_MAX = 4096;

/**
 * - ok: token valid dan diterbitkan untuk hostname situs ini.
 * - invalid: token kosong/salah/kedaluwarsa/dipakai ulang, atau hostname tidak cocok.
 * - unavailable: layanan Google tidak bisa dihubungi, lambat (>5 detik), atau jawabannya rusak.
 * - misconfigured: secret key kosong atau ditolak Google; masalah konfigurasi, bukan pengguna.
 */
export type HasilRecaptcha = 'ok' | 'invalid' | 'unavailable' | 'misconfigured';

type JawabanGoogle = {
  success?: boolean;
  hostname?: string;
  'error-codes'?: string[];
};

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Hostname yang dianggap sah sebagai asal token: host situs (NEXT_PUBLIC_SITE_URL), origin yang
 * dikonfigurasi (CSRF_ALLOWED_ORIGINS), dan host permintaan ini (X-Forwarded-Host / Host dari
 * reverse proxy). Host permintaan disertakan agar login tidak terkunci bila NEXT_PUBLIC_SITE_URL
 * salah di server (pernah terjadi: localhost:9500).
 */
export function hostnameSah(headers: Headers): string[] {
  const hosts = new Set<string>();
  const tambah = (v: string | null | undefined) => {
    const h = hostOf(v);
    if (h) hosts.add(h);
  };
  tambah(process.env.NEXT_PUBLIC_SITE_URL);
  for (const o of process.env.CSRF_ALLOWED_ORIGINS?.split(',') ?? []) tambah(o.trim());
  tambah(headers.get('x-forwarded-host')?.split(',')[0]?.trim());
  tambah(headers.get('host')?.split(',')[0]?.trim());
  return [...hosts];
}

export async function verifyRecaptcha(opts: {
  secretKey: string | undefined | null;
  token: string | undefined | null;
  ip?: string;
  hostnameSah: string[];
}): Promise<HasilRecaptcha> {
  const secret = opts.secretKey?.trim();
  if (!secret) return 'misconfigured';
  const token = opts.token?.trim();
  if (!token || token.length > TOKEN_MAX) return 'invalid';

  const body = new URLSearchParams({ secret, response: token });
  if (opts.ip && opts.ip !== 'unknown') body.set('remoteip', opts.ip);

  let data: JawabanGoogle;
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return 'unavailable';
    data = (await res.json()) as JawabanGoogle;
  } catch {
    return 'unavailable';
  }
  if (!data || typeof data !== 'object') return 'unavailable';

  if (data.success !== true) {
    const kode = Array.isArray(data['error-codes']) ? data['error-codes'] : [];
    if (kode.includes('missing-input-secret') || kode.includes('invalid-input-secret')) {
      return 'misconfigured';
    }
    return 'invalid';
  }

  const hostname = hostOf(data.hostname);
  if (!hostname || !opts.hostnameSah.includes(hostname)) return 'invalid';
  return 'ok';
}
