import slugify from 'slugify';

const MAKS = 80;

export function toSlug(input: string): string {
  const s = slugify((input || '').replace(/[&/]/g, ' '), { lower: true, strict: true, trim: true });
  if (s.length <= MAKS) return s;
  const potong = s.slice(0, MAKS);
  // Potong di batas kata ("-" terakhir); tanpa "-" sama sekali, potong tepat di MAKS.
  // Bila karakter ke-81 adalah "-", potongan sudah di batas kata.
  const i = s[MAKS] === '-' ? MAKS : potong.lastIndexOf('-');
  return (i > 0 ? potong.slice(0, i) : potong).replace(/-+$/, '');
}
