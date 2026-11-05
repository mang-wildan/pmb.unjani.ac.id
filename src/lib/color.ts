// Fungsi warna dan kontras (WCAG) untuk komponen landing. Dipindah dari FakultasProdiSection
// agar dipakai bersama penjelajah program studi (FR-48: warna default mengikuti palet brand).

/** Warna brand (sama dengan `brand.DEFAULT` di tailwind.config.ts). */
export const WARNA_BRAND = '#24b47f';

const HEX6 = /^#[0-9a-f]{6}$/i;
const HEX3 = /^#[0-9a-f]{3}$/i;

/** Mengubah #rgb atau #rrggbb menjadi #rrggbb huruf kecil; selain itu mengembalikan fallback. */
export function normalisasiHex(hex: string | null | undefined, fallback: string = WARNA_BRAND): string {
  const v = (hex ?? '').trim();
  if (HEX6.test(v)) return v.toLowerCase();
  if (HEX3.test(v)) return ('#' + [...v.slice(1)].map((c) => c + c).join('')).toLowerCase();
  return fallback;
}

export function withAlpha(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

export function relativeLuminance(hex: string): number {
  return hexToRgb(hex).reduce((sum, c, i) => {
    const s = c / 255;
    return sum + (s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)) * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function gelapkanSampai(hex: string, ok: (kandidat: string) => boolean, cadangan: string): string {
  if (ok(hex)) return hex;
  const [r, g, b] = hexToRgb(hex);
  for (let f = 0.85; f > 0.05; f -= 0.05) {
    const d = '#' + [r, g, b].map((c) => Math.round(c * f).toString(16).padStart(2, '0')).join('');
    if (ok(d)) return d;
  }
  return cadangan;
}

/** Menggelapkan warna sampai kontrasnya terhadap putih ≥4.5:1 (teks biasa di latar terang, WCAG AA). */
export function darkenToAA(hex: string): string {
  return gelapkanSampai(hex, (c) => contrastRatio(c, '#ffffff') >= 4.5, '#111827');
}

/** Menggelapkan warna sampai teks putih di atasnya berkontras ≥4.5:1 (latar berwarna, WCAG AA). */
export function darkenForWhiteText(hex: string): string {
  return gelapkanSampai(hex, (c) => contrastRatio('#ffffff', c) >= 4.5, '#1e1b4b');
}
