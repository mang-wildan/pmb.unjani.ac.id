import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// TOTP RFC 6238 / HOTP RFC 4226 dengan node:crypto (FR-07). Parameter yang dipakai aplikasi:
// HMAC-SHA1, 6 digit, periode 30 detik — parameter default yang didukung Google Authenticator
// dan Microsoft Authenticator. Modul ini tidak menyentuh database dan tidak pernah mencatat rahasia.

export const PERIODE_DETIK = 30;
export const DIGIT = 6;
export const PENERBIT = 'PMB UNJANI';
/** Toleransi selisih jam perangkat: periode sebelum dan sesudah periode saat ini (±30 detik). */
const TOLERANSI = 1;
/** 160 bit, panjang kunci yang direkomendasikan RFC 4226 untuk HMAC-SHA1. */
const PANJANG_RAHASIA_BYTE = 20;

export type Algoritma = 'sha1' | 'sha256' | 'sha512';

// ---------------------------------------------------------------------------------------------
// Base32 RFC 4648 (tanpa padding pada keluaran)

const ALFABET_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(data: Uint8Array): string {
  let bit = 0;
  let nilai = 0;
  let keluaran = '';
  for (const byte of data) {
    nilai = (nilai << 8) | byte;
    bit += 8;
    while (bit >= 5) {
      keluaran += ALFABET_BASE32[(nilai >>> (bit - 5)) & 31];
      bit -= 5;
    }
  }
  if (bit > 0) keluaran += ALFABET_BASE32[(nilai << (5 - bit)) & 31];
  return keluaran;
}

/** Menerima huruf kecil, spasi, tanda hubung, dan padding '='; karakter lain → error. */
export function base32Decode(teks: string): Buffer {
  const bersih = teks.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  let bit = 0;
  let nilai = 0;
  const keluaran: number[] = [];
  for (const c of bersih) {
    const i = ALFABET_BASE32.indexOf(c);
    if (i < 0) throw new Error('Karakter base32 tidak valid');
    nilai = (nilai << 5) | i;
    bit += 5;
    if (bit >= 8) {
      keluaran.push((nilai >>> (bit - 8)) & 255);
      bit -= 8;
    }
  }
  return Buffer.from(keluaran);
}

// ---------------------------------------------------------------------------------------------
// HOTP / TOTP

/** HOTP RFC 4226: HMAC atas counter 8 byte big-endian, lalu dynamic truncation. */
export function kodeHotp(kunci: Uint8Array, counter: bigint, digit = DIGIT, algoritma: Algoritma = 'sha1'): string {
  const pesan = Buffer.alloc(8);
  pesan.writeBigUInt64BE(counter);
  const hmac = createHmac(algoritma, kunci).update(pesan).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const biner =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(biner % 10 ** digit).padStart(digit, '0');
}

/** Nomor periode TOTP (T dalam RFC 6238) untuk waktu tertentu. */
export function periodeDari(waktuMs: number): number {
  return Math.floor(waktuMs / 1000 / PERIODE_DETIK);
}

export function kodeTotp(
  kunci: Uint8Array,
  waktuMs: number,
  digit = DIGIT,
  algoritma: Algoritma = 'sha1',
): string {
  return kodeHotp(kunci, BigInt(periodeDari(waktuMs)), digit, algoritma);
}

/** Rahasia baru dalam base32 tanpa padding (32 karakter). */
export function buatRahasia(): string {
  return base32Encode(randomBytes(PANJANG_RAHASIA_BYTE));
}

/** Kunci manual untuk diketik di aplikasi authenticator: kelompok 4 karakter. */
export function formatKunciManual(rahasia: string): string {
  return rahasia.replace(/(.{4})(?=.)/g, '$1 ');
}

/** URI otpauth:// untuk QR code (format Key Uri Google Authenticator). */
export function uriOtpauth(rahasia: string, akun: string): string {
  const label = `${encodeURIComponent(PENERBIT)}:${encodeURIComponent(akun)}`;
  const q = new URLSearchParams({
    secret: rahasia,
    issuer: PENERBIT,
    algorithm: 'SHA1',
    digits: String(DIGIT),
    period: String(PERIODE_DETIK),
  });
  // URLSearchParams mengode spasi sebagai '+'; sebagian aplikasi menampilkannya apa adanya.
  return `otpauth://totp/${label}?${q.toString().replace(/\+/g, '%20')}`;
}

export type HasilTotp = { ok: true; periode: number } | { ok: false; alasan: 'format' | 'salah' | 'dipakai_ulang' };

/**
 * Verifikasi kode TOTP 6 digit terhadap periode −1, 0, +1. Periode yang ≤ periodeTerakhir
 * ditolak (anti-replay); pemanggil wajib menyimpan `periode` hasil sukses ke mfaPeriodeTerakhir
 * secara atomik. Ketiga kandidat selalu dihitung dan dibandingkan konstan-waktu.
 */
export function verifikasiTotp(opts: {
  rahasia: string;
  kode: string;
  periodeTerakhir?: number | null;
  waktuMs?: number;
}): HasilTotp {
  const kode = opts.kode.replace(/\s/g, '');
  if (!/^\d{6}$/.test(kode)) return { ok: false, alasan: 'format' };

  const kunci = base32Decode(opts.rahasia);
  const sekarang = periodeDari(opts.waktuMs ?? Date.now());
  const masukan = Buffer.from(kode);
  let cocok: number | null = null;
  for (let d = -TOLERANSI; d <= TOLERANSI; d++) {
    const periode = sekarang + d;
    const kandidat = Buffer.from(kodeHotp(kunci, BigInt(periode)));
    // Ambil periode terbesar yang cocok (tabrakan kode antarperiode sangat jarang).
    if (timingSafeEqual(kandidat, masukan)) cocok = periode;
  }
  if (cocok === null) return { ok: false, alasan: 'salah' };
  const terakhir = opts.periodeTerakhir;
  if (typeof terakhir === 'number' && cocok <= terakhir) return { ok: false, alasan: 'dipakai_ulang' };
  return { ok: true, periode: cocok };
}
