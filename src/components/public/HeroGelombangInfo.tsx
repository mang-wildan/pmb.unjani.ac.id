import { getTranslations } from 'next-intl/server';
import IndikatorPing from './IndikatorPing';

type GelombangInfo = { _id: string; ke: number; judul: string; jalur: { nama: string }[]; selesai: string };

export default async function HeroGelombangInfo({ gelombang }: { gelombang: GelombangInfo[] }) {
  const t = await getTranslations('hero');
  const aktif = gelombang.filter((g) => new Date(g.selesai).getTime() >= Date.now());
  const daftar = aktif.length ? aktif : gelombang;
  const habis = aktif.length === 0 && gelombang.length > 0;
  const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  return (
    <div className="overflow-hidden rounded-lg bg-white text-ink shadow-xl ring-1 ring-black/5">
      <div className="flex items-center gap-2 border-b border-white/10 bg-brand px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
        {!habis && gelombang.length > 0 && <span className="relative flex h-2 w-2"><IndikatorPing className="bg-[#D4AF37]" /><span className="h-2 w-2 rounded-full bg-[#D4AF37]" /></span>}
        <span>{habis ? t('pendaftaranSelesai') : t('pendaftaranAktif')}</span>
      </div>
      <div className="space-y-2.5 p-3">
        {daftar.length === 0 ? (
          <a href="#jadwal" className={`block rounded-lg border border-dashed border-ln px-4 py-6 text-center text-sm text-ink-muted transition-colors hover:border-brand hover:text-brand ${focus}`}>{t('gelombangKosong')}</a>
        ) : daftar.map((g) => (
          <a key={g._id} href="#jadwal" className={`group flex items-start gap-3 rounded-lg border border-ln/80 bg-bg/40 p-3.5 transition-colors hover:border-brand hover:bg-soft/40 ${focus}`}>
            <span aria-hidden className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#D4AF37]" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold leading-snug text-balance">{g.judul}</p>
              {g.jalur?.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {g.jalur.map((j) => <span key={j.nama} className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">{j.nama}</span>)}
                </p>
              )}
            </div>
            <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ln text-brand transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
