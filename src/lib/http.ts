import { isIP } from 'node:net';
import { NextResponse } from 'next/server';

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorJson(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Rapikan satu kandidat IP: buang port/kurung siku, kembalikan null bila bukan IP valid. */
function normalizeIp(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value || value.length > 64) return null;
  if (isIP(value)) return value;
  const bracketed = /^\[([^\]]+)\](?::\d{1,5})?$/.exec(value);
  if (bracketed && isIP(bracketed[1]) === 6) return bracketed[1];
  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/.exec(value);
  if (ipv4WithPort && isIP(ipv4WithPort[1]) === 4) return ipv4WithPort[1];
  return null;
}

/**
 * IP klien yang tidak dapat dipalsukan lewat header (FR-24).
 *
 * Entri X-Forwarded-For PALING KANAN ditambahkan oleh reverse proxy terdekat (Nginx), sedangkan
 * entri di kirinya bisa dikirim sendiri oleh klien. Urutan sumber:
 *   1. entri paling kanan X-Forwarded-For,
 *   2. X-Real-IP (hanya bila X-Forwarded-For tidak ada),
 *   3. 'unknown'.
 * Aman baik Nginx menimpa maupun menambahkan X-Forwarded-For. Syarat operasional: port Node tidak
 * boleh dapat diakses langsung tanpa melewati Nginx (lihat RILIS-CHECKLIST).
 */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded !== null) {
    const entries = forwarded.split(',');
    return normalizeIp(entries[entries.length - 1]) ?? 'unknown';
  }
  return normalizeIp(headers.get('x-real-ip')) ?? 'unknown';
}

export function getClientIp(req: Request): string {
  return clientIpFromHeaders(req.headers);
}

const OVERHEAD_MULTIPART_BYTE = 64 * 1024;

/**
 * Tolak permintaan upload yang terlalu besar SEBELUM body dibaca (FR-27): `req.formData()`
 * menampung seluruh body di memori. Header Content-Length yang tidak ada (chunked), tidak valid,
 * atau melebihi batas + overhead multipart dijawab 413. Batas file sebenarnya tetap diperiksa
 * setelah parsing; ini hanya pagar awal.
 */
export function tolakBodyBesar(req: Request, batasMb: number): NextResponse | null {
  const raw = req.headers.get('content-length');
  const ukuran = raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isFinite(ukuran) || ukuran > batasMb * 1024 * 1024 + OVERHEAD_MULTIPART_BYTE) {
    return NextResponse.json({ error: `Ukuran permintaan melebihi batas ${batasMb} MB` }, { status: 413 });
  }
  return null;
}

/**
 * Baca body multipart; null bila body rusak atau terpotong (mis. melebihi batas buffer proxy),
 * agar pemanggil menjawab 400, bukan 500 (FR-28).
 */
export async function bacaFormData(req: Request): Promise<FormData | null> {
  try {
    return await req.formData();
  } catch {
    return null;
  }
}
