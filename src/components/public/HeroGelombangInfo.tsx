import { getTranslations } from 'next-intl/server';
import IndikatorPing from './IndikatorPing';

type GelombangInfo = { _id: string; ke: number; judul: string; jalur: { nama: string }[]; selesai: string };

export default async function HeroGelombangInfo({ gelombang }: { gelombang: GelombangInfo[] }) {
  const t = await getTranslations('hero');
  const aktif = gelombang.filter((g) => new Date(g.selesai).getTime() >= Date.now());
  const daftar = aktif.length ? aktif : gelombang;
  const habis = aktif.length === 0 && gelombang.length > 0;
  const focus = 'focus-visible:outline-none focus-visible:bg-brand-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand';
  return (
    <div className="overflow-hidden rounded-lg bg-white text-ink shadow-xl ring-1 ring-black/5">
      <div className="flex items-center gap-2.5 border-b border-white/10 bg-brand px-5 py-3.5 text-xs font-semibold tracking-wide text-white">
        {!habis && gelombang.length > 0 && (
          <span className="relative flex h-2 w-2">
            <IndikatorPing className="bg-[#D4AF37]" />
            <span className="h-2 w-2 rounded-full bg-[#D4AF37]" />
          </span>
        )}
        <span>{habis ? t('pendaftaranSelesai') : t('pendaftaranAktif')}</span>
      </div>
      <div className="divide-y divide-ln/60">
        {daftar.length === 0 ? (
          <a
            href="#jadwal"
            className={`block px-5 py-6 text-center text-sm text-ink-muted transition-colors hover:text-brand ${focus}`}
          >
            {t('gelombangKosong')}
          </a>
        ) : (
          daftar.map((g) => (
            <a
              key={g._id}
              href="#jadwal"
              className={`group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-50/40 motion-reduce:transition-none ${focus}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-bold leading-snug text-ink transition-colors group-hover:text-brand sm:text-base">
                  {g.judul}
                </p>
                {g.jalur?.length > 0 && (
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    {g.jalur.map((j) => (
                      <span
                        key={j.nama}
                        className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800"
                      >
                        {j.nama}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              <span
                aria-hidden="true"
                className="shrink-0 text-base font-semibold text-brand/60 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand motion-reduce:transition-none"
              >
                →
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
