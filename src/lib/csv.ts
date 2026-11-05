// Sel CSV aman dari formula injection (FR-21). Teks yang diawali =, +, -, @, tab, atau CR
// dibaca Excel/Sheets sebagai formula; awalan `'` membuatnya tampil sebagai teks biasa.
// Angka (number/bigint/boolean) tidak dinetralkan agar nilai negatif tetap numerik.

const AWAL_FORMULA = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let raw = value == null ? '' : String(value);
  if (typeof value === 'string' && AWAL_FORMULA.test(raw)) raw = `'${raw}`;
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}
