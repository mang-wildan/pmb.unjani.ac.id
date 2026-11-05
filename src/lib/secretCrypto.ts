import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Enkripsi rahasia TOTP saat tersimpan (FR-10, PLAN D2): AES-256-GCM dengan kunci dari
// MFA_ENCRYPTION_KEY (32 byte, base64; G-5). Format tersimpan:
//   v1.<iv base64url>.<tag base64url>.<ciphertext base64url>
// Versi di depan memungkinkan rotasi kunci kelak. Nilai kunci tidak pernah ditulis ke log.

const VERSI = 'v1';
const PANJANG_KUNCI = 32;
const PANJANG_IV = 12; // ukuran IV yang dianjurkan untuk GCM
const PANJANG_TAG = 16;

/** Kunci tidak ada/salah, atau data tersimpan rusak/diubah. Pesan aman ditampilkan di log server. */
export class SecretCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretCryptoError';
  }
}

function ambilKunci(): Buffer {
  const mentah = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (!mentah) {
    throw new SecretCryptoError(
      'MFA_ENCRYPTION_KEY belum diset. Buat 32 byte acak base64 dan simpan di .env server (lihat RILIS-CHECKLIST).',
    );
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(mentah)) {
    throw new SecretCryptoError('MFA_ENCRYPTION_KEY bukan base64 yang valid.');
  }
  const kunci = Buffer.from(mentah, 'base64');
  if (kunci.length !== PANJANG_KUNCI) {
    throw new SecretCryptoError(
      `MFA_ENCRYPTION_KEY harus 32 byte setelah decode base64 (saat ini ${kunci.length} byte).`,
    );
  }
  return kunci;
}

/** Lempar SecretCryptoError bila kunci tidak siap; untuk pemeriksaan sebelum memulai pendaftaran MFA. */
export function pastikanKunciEnkripsi(): void {
  ambilKunci();
}

/**
 * Enkripsi teks. `konteks` (mis. id akun) diikat sebagai AAD: ciphertext milik akun lain
 * yang disalin ke dokumen ini gagal didekripsi.
 */
export function enkripsiRahasia(teks: string, konteks: string): string {
  const kunci = ambilKunci();
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', kunci, iv, { authTagLength: PANJANG_TAG });
  cipher.setAAD(Buffer.from(konteks, 'utf8'));
  const isi = Buffer.concat([cipher.update(teks, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSI, iv.toString('base64url'), tag.toString('base64url'), isi.toString('base64url')].join('.');
}

export function dekripsiRahasia(tersimpan: string, konteks: string): string {
  const bagian = tersimpan.split('.');
  if (bagian.length !== 4 || bagian[0] !== VERSI) {
    throw new SecretCryptoError('Format rahasia MFA tersimpan tidak dikenal.');
  }
  const kunci = ambilKunci();
  const iv = Buffer.from(bagian[1], 'base64url');
  const tag = Buffer.from(bagian[2], 'base64url');
  const isi = Buffer.from(bagian[3], 'base64url');
  if (iv.length !== PANJANG_IV || tag.length !== PANJANG_TAG) {
    throw new SecretCryptoError('Format rahasia MFA tersimpan rusak.');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', kunci, iv, { authTagLength: PANJANG_TAG });
    decipher.setAAD(Buffer.from(konteks, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(isi), decipher.final()]).toString('utf8');
  } catch {
    // Tag tidak cocok: kunci berbeda, data diubah, atau konteks (akun) salah.
    throw new SecretCryptoError(
      'Rahasia MFA tidak dapat didekripsi (MFA_ENCRYPTION_KEY berbeda atau data rusak). Akun perlu reset MFA.',
    );
  }
}
