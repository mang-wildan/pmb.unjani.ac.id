import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="font-display text-7xl font-extrabold text-brand">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-muted">Mungkin halaman sudah dipindah atau tautan tidak lagi berlaku.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
