import { getTranslations } from 'next-intl/server';
import IndikatorPing from './IndikatorPing';

type GelombangInfo = { _id: string; ke: number; judul: string; jalur: { nama: string }[]; selesai: string };

export default async function HeroGelombangInfo({ gelombang }: { gelombang: GelombangInfo[] }) {
  const t = await getTranslations('hero');
  const aktif = gelombang.filter((g) => new Date(g.selesai).getTime() >= Date.now());
  const daftar = aktif.length ? aktif : gelombang;
  const habis = aktif.length === 0 && gelombang.length > 0;
  return (
    <div className="rounded-lg bg-white p-6 text-ink shadow-lg">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
        {!habis && gelombang.length > 0 && <span className="relative flex h-2 w-2"><IndikatorPing className="bg-brand" /><span className="h-2 w-2 rounded-full bg-brand" /></span>}
        <span>{habis ? t('pendaftaranSelesai') : t('pendaftaranAktif')}</span>
      </div>
      <div className="mt-4 space-y-3">
        {daftar.length === 0 ? <a href="#jadwal" className="text-sm text-ink-muted">{t('gelombangKosong')}</a> : daftar.map((g) => (
          <a key={g._id} href="#jadwal" className="group flex items-center justify-between rounded-lg border border-[#CBD9CD] p-3 hover:border-brand">
            <div>
              <p className="font-display text-base font-bold">{g.judul}</p>
              {g.jalur?.length > 0 && <p className="text-xs text-ink-muted">{g.jalur.map((j) => j.nama).join(', ')}</p>}
            </div>
            <span aria-hidden className="text-xl transition-transform group-hover:translate-x-1">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
