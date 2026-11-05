import { z } from 'zod';
import { COMMON_PASSWORDS } from '@/lib/data/commonPasswords';

// Kebijakan password akun admin (FR-26, ASVS 5.0 V6.2): panjang 8-64 karakter, bukan password
// umum, tanpa aturan komposisi (huruf besar/angka/simbol). Hanya untuk membuat atau mengubah
// password; login tidak memakainya agar akun lama tetap bisa masuk.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
/** bcrypt hanya memakai 72 byte pertama; di atas itu password dipotong diam-diam, jadi ditolak. */
export const PASSWORD_MAX_BYTE = 72;

const UMUM = new Set(COMMON_PASSWORDS.map((p) => p.toLowerCase()));

// Kata konteks situs: mudah ditebak penyerang yang tahu ini sistem PMB UNJANI (ASVS 5.0 V6.2.11).
const KATA_KONTEKS = [
  'unjani', 'pmb', 'admin', 'administrator', 'superadmin', 'editor', 'universitas', 'jenderal',
  'achmad', 'yani', 'cimahi', 'mahasiswa', 'penerimaan',
];
const KONTEKS = new Set(KATA_KONTEKS);
for (const k of KATA_KONTEKS) UMUM.add(k);

// Substitusi gaya leet yang lazim: p@ssw0rd -> password.
const LEET: Record<string, string> = {
  '@': 'a', '4': 'a', '0': 'o', '1': 'l', '!': 'i', '3': 'e', $: 's', '5': 's', '7': 't',
};
const AKHIRAN = /[0-9!@#$%^&*()_+=.,?~-]+$/;
const BASE_MIN = 4;

/** Umum bila sama dengan, atau hanya "kata umum + akhiran angka/simbol" (password123, Admin#2026, p@ssw0rd1). */
function terlaluUmum(plain: string): boolean {
  const lower = plain.normalize('NFKC').toLowerCase();
  // Akhiran dibuang SEBELUM substitusi leet: angka 1 dan 3 di akhiran bukan huruf l atau e.
  const dasar = lower.replace(AKHIRAN, '');
  const ganti = (s: string) => [...s].map((c) => LEET[c] ?? c).join('');
  const kandidat = new Set([lower, ganti(lower), dasar, ganti(dasar)]);
  for (const k of kandidat) {
    if (UMUM.has(k) && (k === lower || k === ganti(lower) || k.length >= BASE_MIN)) return true;
  }
  // Semua kata (dipisah tanda baca/spasi) adalah kata konteks situs: "pmb-unjani", "Unjani Admin 1".
  const kata = dasar.split(/[^a-z0-9]+/).filter(Boolean);
  return kata.length >= 2 && kata.every((k) => KONTEKS.has(k.replace(/[0-9]+$/, '')));
}

/** Pesan kesalahan berbahasa Indonesia, atau null bila password memenuhi kebijakan. */
export function validatePassword(plain: string): string | null {
  const panjang = Array.from(plain).length; // hitung karakter Unicode, bukan unit UTF-16
  if (panjang < PASSWORD_MIN) return `Password minimal ${PASSWORD_MIN} karakter`;
  if (panjang > PASSWORD_MAX) return `Password maksimal ${PASSWORD_MAX} karakter`;
  if (new TextEncoder().encode(plain).length > PASSWORD_MAX_BYTE) {
    return `Password terlalu panjang untuk disimpan aman (maks. ${PASSWORD_MAX_BYTE} byte; huruf non-Latin memakan 2-4 byte per karakter). Persingkat password.`;
  }
  if (terlaluUmum(plain)) {
    return 'Password terlalu umum dan mudah ditebak. Gunakan password lain.';
  }
  return null;
}

/** Skema Zod untuk password baru; pesan kebijakan menjadi pesan isu agar bisa ditampilkan ke admin. */
export const passwordBaru = z.string().superRefine((value, ctx) => {
  const pesan = validatePassword(value);
  if (pesan) ctx.addIssue({ code: z.ZodIssueCode.custom, message: pesan });
});

/** Pesan galat untuk respons 400: alasan kebijakan password bila ada, selain itu pesan umum. */
export function pesanGalat(issues: { path: (string | number)[]; message: string }[]): string {
  const pw = issues.find((i) => i.path[0] === 'password');
  return pw ? pw.message : 'Data tidak valid';
}
