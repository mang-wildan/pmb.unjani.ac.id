import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';

// Kode pemulihan MFA (FR-08, PLAN D2 & keputusan 9): 10 kode sekali pakai, masing-masing
// 10 karakter Crockford base32 (50 bit), tampil sebagai "xxxxx-xxxxx". Disimpan sebagai hash
// SHA-256; entropi 50 bit membuat hash lambat (bcrypt) tidak menambah keamanan berarti.

export const JUMLAH_KODE = 10;
const PANJANG_KODE = 10;
// Crockford base32 huruf kecil: tanpa i, l, o, u agar tidak tertukar saat dibaca/diketik.
const ALFABET = '0123456789abcdefghjkmnpqrstvwxyz';

function kodeAcak(): string {
  const byte = randomBytes(PANJANG_KODE);
  let kode = '';
  // 256 habis dibagi 32, jadi mengambil 5 bit bawah tidak menimbulkan bias.
  for (const b of byte) kode += ALFABET[b & 31];
  return kode;
}

/** Tampilan: dua kelompok 5 karakter. */
function tampilan(kode: string): string {
  return `${kode.slice(0, 5)}-${kode.slice(5)}`;
}

/**
 * Bentuk baku kode masukan pengguna: huruf kecil, tanpa spasi/tanda hubung, i/l → 1, o → 0
 * (aturan Crockford). Null bila bukan kode yang sah.
 */
export function normalisasiKode(masukan: string): string | null {
  const baku = masukan
    .toLowerCase()
    .replace(/[\s-]/g, '')
    .replace(/[il]/g, '1')
    .replace(/o/g, '0');
  if (baku.length !== PANJANG_KODE) return null;
  for (const c of baku) if (!ALFABET.includes(c)) return null;
  return baku;
}

export function hashKode(kodeBaku: string): string {
  return createHash('sha256').update(kodeBaku, 'utf8').digest('hex');
}

/** Set baru: `kode` ditampilkan SEKALI ke pengguna, hanya `hash` yang disimpan. */
export function buatKodePemulihan(): { kode: string[]; hash: string[] } {
  const set = new Set<string>();
  while (set.size < JUMLAH_KODE) set.add(kodeAcak());
  const baku = [...set];
  return { kode: baku.map(tampilan), hash: baku.map(hashKode) };
}

/**
 * Hash tersimpan yang cocok dengan masukan, atau null. Semua hash selalu dibandingkan
 * konstan-waktu tanpa berhenti di kecocokan pertama.
 */
export function cocokkanKode(masukan: string, hashTersimpan: readonly string[]): string | null {
  const baku = normalisasiKode(masukan);
  if (!baku) return null;
  const target = Buffer.from(hashKode(baku), 'hex');
  let cocok: string | null = null;
  for (const h of hashTersimpan) {
    const calon = Buffer.from(h, 'hex');
    if (calon.length === target.length && timingSafeEqual(calon, target)) cocok = h;
  }
  return cocok;
}

/**
 * Pakai satu kode pemulihan milik akun: hapus hash-nya secara atomik. True hanya bila kode
 * cocok DAN berhasil dihapus oleh permintaan ini, sehingga dua permintaan bersamaan dengan
 * kode yang sama tidak bisa sama-sama lolos.
 */
export async function pakaiKodePemulihan(userId: string, masukan: string): Promise<boolean> {
  await connectDb();
  const user = await AdminUser.findById(userId).select('+mfaKodePemulihan').lean();
  const hash = cocokkanKode(masukan, user?.mfaKodePemulihan ?? []);
  if (!hash) return false;
  const hasil = await AdminUser.updateOne(
    { _id: userId, mfaKodePemulihan: hash },
    { $pull: { mfaKodePemulihan: hash } },
  );
  return hasil.modifiedCount === 1;
}
