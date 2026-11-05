import { z } from 'zod';

// Skema Zod bersama untuk field konten yang dirender sebagai tautan (FR-20).
// `z.string().url()` menerima skema apa pun (javascript:, data:, vbscript:, ...); yang dirender
// sebagai href di halaman publik hanya boleh http/https.

/** Hanya skema http: atau https:. Spasi di tepi dibuang. */
export const urlHttp = z
  .string()
  .trim()
  .url('URL tidak valid')
  .refine(
    (v) => {
      try {
        const { protocol } = new URL(v);
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL harus diawali http:// atau https://' },
  );

/** Seperti urlHttp, tetapi string kosong (tanpa tautan) juga diterima. */
export const urlHttpOpsional = z.union([z.literal(''), urlHttp]);
