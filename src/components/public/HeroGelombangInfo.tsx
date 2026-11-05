import IndikatorPing from './IndikatorPing';

type GelombangInfo = {
  ke: number;
  judul: string;
  jalur: { nama: string }[];
  selesai: string;
};

export default function HeroGelombangInfo({ gelombang }: { gelombang: GelombangInfo[] }) {
  if (gelombang.length === 0) {
    return (
      <a
        href="#jadwal"
        className="group flex items-center gap-3 rounded-2xl bg-white/85 backdrop-blur-md border border-brand-100 md:border-white/60 shadow-soft px-4 py-3 hover:bg-white/95 transition-colors duration-200"
      >
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gray-100">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Status Pendaftaran</p>
          <p className="text-sm font-semibold text-ink leading-tight mt-0.5">Belum ada gelombang aktif</p>
        </div>
        <svg className="h-4 w-4 text-ink-soft flex-none group-hover:translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </a>
    );
  }

  const now = Date.now();
  const activeOnes = gelombang.filter((g) => new Date(g.selesai).getTime() >= now);
  const isAllExpired = activeOnes.length === 0;
  const displayed = isAllExpired ? gelombang : activeOnes;

  return (
    <a
      href="#jadwal"
      className="group block rounded-2xl bg-white/85 backdrop-blur-md border border-brand-100 md:border-white/60 shadow-soft px-4 py-3 hover:bg-white/95 transition-colors duration-200"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 flex-none">
            {!isAllExpired && (
              <IndikatorPing className="bg-brand opacity-75" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isAllExpired ? 'bg-gray-400' : 'bg-brand'}`} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
            {isAllExpired ? 'Berakhir' : 'Pendaftaran Aktif'}
          </span>
        </div>
        <svg className="h-3.5 w-3.5 text-brand-700 flex-none group-hover:translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <div className="mt-1.5 space-y-0.5">
        {displayed.map((g) => (
          <p key={g.ke} className="text-sm font-bold text-ink line-clamp-1">{g.judul}</p>
        ))}
      </div>
    </a>
  );
}
