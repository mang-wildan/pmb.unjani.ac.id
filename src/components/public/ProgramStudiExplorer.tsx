'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ProgramStudiBaris, { type ProgramStudiItem } from '@/components/public/ProgramStudiBaris';
import Reveal from '@/components/public/Reveal';
import { SectionHeading } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { darkenToAA, normalisasiHex, withAlpha } from '@/lib/color';
import { useFlip } from '@/lib/useFlip';

// Penjelajah program studi, fakultas dulu (FR-56–FR-60, Keputusan Teknis #24–#25).
// - DOM tunggal untuk server dan klien: rail fakultas + panel berisi SATU kelompok per fakultas;
//   yang tidak terpilih hanya diberi atribut `hidden`. Semua prodi ada di HTML awal (FR-42).
// - Responsif murni CSS: di <md rail menjadi petak dua kolom dan `data-tingkat` menentukan apakah
//   petak atau panel yang tampil (drill-down); di >=md keduanya berdampingan.
// - Tanpa JavaScript: <noscript><style> menampilkan semua kelompok beserta judulnya dan
//   menyembunyikan navigasi, sehingga seluruh prodi tetap terbaca (FR-59).
// - Pencarian selalu lintas fakultas: mengetik beralih ke mode "Semua" dengan judul kelompok;
//   mengosongkan kata mengembalikan fakultas yang terpilih sebelumnya (FR-58).

export type ExplorerFakultas = { _id: string; nama: string; singkatan: string; warna?: string };
export type ExplorerProdi = ProgramStudiItem;

type Props = {
  fakultas: ExplorerFakultas[];
  programStudi: ExplorerProdi[];
  /** Tautan WhatsApp PMB dari Pengaturan; null bila nomor belum diisi. */
  urlWhatsApp: string | null;
  teks: { eyebrow: string; title: string; desc: string };
};

const URUTAN_JENJANG = ['D3', 'D4', 'S1', 'S2', 'S3', 'Profesi', 'Spesialis'];
const SEMUA = '';

function normalisasi(teks: string): string {
  return teks.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function urutJenjang(daftar: Iterable<string>): string[] {
  const rank = (j: string) => {
    const i = URUTAN_JENJANG.findIndex((x) => x.toLowerCase() === j.toLowerCase());
    return i === -1 ? URUTAN_JENJANG.length : i;
  };
  return [...new Set(daftar)].filter(Boolean).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// CSS fallback tanpa JavaScript (FR-59). Dirender di dalam <noscript> sehingga hanya berlaku bila
// skrip tidak berjalan; CSP publik mengizinkan style inline.
const GAYA_NOSCRIPT = `
#program-studi [data-rail]{display:none!important}
#program-studi [data-panel]{display:block!important}
#program-studi [data-grup-fakultas][hidden]{display:block!important}
#program-studi [data-judul-grup][hidden]{display:flex!important}
#program-studi li[data-flip-key][hidden]{display:list-item!important}
#program-studi [data-hanya-js]{display:none!important}
`;

export default function ProgramStudiExplorer({ fakultas, programStudi, urlWhatsApp, teks }: Props) {
  const t = useTranslations('prodiExplorer');
  const idPanel = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const judulPanelRef = useRef<HTMLHeadingElement | null>(null);
  const flip = useFlip<HTMLDivElement>();

  const fakultasUrut = useMemo(() => [...fakultas].sort((a, b) => a.nama.localeCompare(b.nama, 'id')), [fakultas]);
  const [kata, setKata] = useState('');
  // Fakultas bawaan: yang pertama (TBD-18). Nilai '' = "Semua program studi".
  const [fakultasId, setFakultasId] = useState<string>(fakultasUrut[0]?._id ?? SEMUA);
  const [jenjang, setJenjang] = useState('');
  // Hanya berpengaruh di <md: 'fakultas' = petak tampil, 'prodi' = panel tampil.
  const [tingkat, setTingkat] = useState<'fakultas' | 'prodi'>('fakultas');

  // Prodi yang fakultasnya sudah dihapus tidak punya kelompok untuk dirender; dikeluarkan sejak awal
  // agar jumlah di rail dan status sama dengan baris yang benar-benar tampil.
  const prodiValid = useMemo(() => {
    const idFakultas = new Set(fakultas.map((f) => f._id));
    return programStudi.filter((p) => idFakultas.has(p.fakultas_id._id));
  }, [fakultas, programStudi]);
  const daftar = useMemo(
    () => prodiValid.map((p) => ({ prodi: p, cari: normalisasi(`${p.nama} ${p.singkatan}`) })),
    [prodiValid],
  );
  const perFakultas = useMemo(() => {
    const peta = new Map<string, typeof daftar>();
    for (const f of fakultasUrut) peta.set(f._id, []);
    for (const d of daftar) {
      const id = d.prodi.fakultas_id._id;
      if (!peta.has(id)) peta.set(id, []);
      peta.get(id)!.push(d);
    }
    for (const butir of peta.values()) butir.sort((a, b) => a.prodi.nama.localeCompare(b.prodi.nama, 'id'));
    return peta;
  }, [daftar, fakultasUrut]);
  const jenjangPerFakultas = useMemo(() => {
    const peta = new Map<string, string[]>();
    for (const [id, butir] of perFakultas) peta.set(id, urutJenjang(butir.map((b) => b.prodi.jenjang)));
    return peta;
  }, [perFakultas]);
  const semuaJenjang = useMemo(() => urutJenjang(prodiValid.map((p) => p.jenjang)), [prodiValid]);

  const token = normalisasi(kata.trim()).split(/\s+/).filter(Boolean);
  const modeSemua = token.length > 0 || fakultasId === SEMUA;
  const fakultasAktif = fakultasUrut.find((f) => f._id === fakultasId) ?? null;

  const cocok = (d: (typeof daftar)[number]) =>
    (modeSemua || d.prodi.fakultas_id._id === fakultasId) &&
    (!jenjang || d.prodi.jenjang === jenjang) &&
    token.every((tk) => d.cari.includes(tk));
  const tampil = new Set(daftar.filter(cocok).map((d) => d.prodi._id));
  const jumlah = tampil.size;
  const jenjangTersedia = modeSemua ? semuaJenjang : (jenjangPerFakultas.get(fakultasId) ?? []);
  const adaFilter = token.length > 0 || jenjang !== '';

  const pilihFakultas = (id: string) => {
    flip.catat();
    setFakultasId(id);
    setKata('');
    if (jenjang && id !== SEMUA && !(jenjangPerFakultas.get(id) ?? []).includes(jenjang)) setJenjang('');
    setTingkat('prodi');
    // Di <md petak yang ditekan ikut tersembunyi; pindahkan fokus ke judul panel agar tidak jatuh ke body.
    // Fokus tanpa preventScroll ikut membawa panel hasil ke dalam viewport.
    if (window.matchMedia('(max-width: 767px)').matches) {
      requestAnimationFrame(() => judulPanelRef.current?.focus());
    }
  };
  const ubahKata = (v: string) => {
    flip.catat();
    setKata(v);
    if (v.trim() !== '') {
      setTingkat('prodi');
    } else if (jenjang && fakultasId !== SEMUA && !(jenjangPerFakultas.get(fakultasId) ?? []).includes(jenjang)) {
      // Kembali ke fakultas yang tidak punya jenjang terpilih: lepas filter agar chip-nya tidak hilang
      // sementara hasil tetap kosong.
      setJenjang('');
    }
  };
  const ubahJenjang = (v: string) => {
    flip.catat();
    setJenjang(v);
  };
  const kembali = () => {
    setTingkat('fakultas');
    setKata('');
    requestAnimationFrame(() => {
      const tombol = railRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      tombol?.focus();
    });
  };
  const hapusFilter = () => {
    flip.catat();
    setKata('');
    setJenjang('');
    inputRef.current?.focus();
  };

  return (
    <section
      id="program-studi"
      className="bg-[#E3ECE3] py-16 md:py-24 scroll-mt-24"
      aria-labelledby="fakultas-heading"
    >
      <noscript dangerouslySetInnerHTML={{ __html: `<style>${GAYA_NOSCRIPT}</style>` }} />
      <div className="container mx-auto">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <Reveal>
            <SectionHeading eyebrow={teks.eyebrow} title={teks.title} description={teks.desc} id="fakultas-heading" />
          </Reveal>

          <div className="relative mt-6 lg:mt-0 lg:w-80 lg:shrink-0" data-hanya-js="">
            <label htmlFor="cari-prodi" className="sr-only">
              {t('cariLabel')}
            </label>
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft" aria-hidden="true" />
            <input
              id="cari-prodi"
              ref={inputRef}
              type="search"
              value={kata}
              onChange={(e) => ubahKata(e.target.value)}
              placeholder={t('cariPlaceholder')}
              autoComplete="off"
              aria-controls={idPanel}
              className="h-12 w-full rounded-lg border border-brand-100 bg-white pl-11 pr-4 text-base text-ink shadow-sm placeholder:text-ink-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
          {/* Rail (>=md) / petak dua kolom (<md). */}
          <nav
            ref={railRef}
            data-rail=""
            data-tingkat={tingkat}
            aria-label={t('navFakultas')}
            // Di layar pendek rail sticky bisa lebih tinggi dari viewport: batasi tinggi dan beri gulir dalam
            // hanya pada rail (navigasi), bukan pada panel isi.
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-md:data-[tingkat=prodi]:hidden lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:grid-cols-1 lg:gap-1 lg:overflow-y-auto lg:rounded-lg lg:border lg:border-ln/70 lg:bg-white lg:p-2 lg:shadow-soft"
          >
            <TombolFakultas
              aktif={modeSemua}
              onClick={() => pilihFakultas(SEMUA)}
              warna={undefined}
              idPanel={idPanel}
              singkatan={String(prodiValid.length)}
              nama={t('ringkasan', { prodi: prodiValid.length, fakultas: fakultas.length })}
              jumlah={prodiValid.length}
              jenjang={semuaJenjang}
              semua
            />
            {fakultasUrut.map((f) => (
              <TombolFakultas
                key={f._id}
                aktif={!modeSemua && fakultasId === f._id}
                onClick={() => pilihFakultas(f._id)}
                warna={f.warna}
                idPanel={idPanel}
                singkatan={f.singkatan}
                nama={f.nama}
                jumlah={perFakultas.get(f._id)?.length ?? 0}
                jenjang={jenjangPerFakultas.get(f._id) ?? []}
              />
            ))}
          </nav>

          {/* Panel prodi. */}
          <div
            id={idPanel}
            ref={flip.ref}
            data-panel=""
            data-tingkat={tingkat}
            className="mt-4 max-md:hidden max-md:data-[tingkat=prodi]:block lg:mt-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-3" data-hanya-js="">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={kembali}
                  className="mb-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-xs font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:hidden"
                >
                  <i className="fa-solid fa-arrow-left text-[0.7rem]" aria-hidden="true" />
                  {t('kembali')}
                </button>
                <h3 ref={judulPanelRef} tabIndex={-1} className="font-display text-lg font-bold leading-tight text-ink focus:outline-none">
                  {modeSemua ? (token.length > 0 ? t('hasilSemua') : t('semuaProdi')) : (fakultasAktif?.nama ?? '')}
                </h3>
                <p role="status" aria-live="polite" className="mt-0.5 text-sm text-brand-800">
                  {t('jumlahHasil', { n: jumlah })}
                </p>
              </div>
              {jenjangTersedia.length > 1 && (
                <div role="group" aria-label={t('filterJenjang')} className="flex flex-wrap gap-1.5">
                  <ChipKecil aktif={jenjang === ''} onClick={() => ubahJenjang('')}>
                    {t('semuaJenjang')}
                  </ChipKecil>
                  {jenjangTersedia.map((j) => (
                    <ChipKecil key={j} aktif={jenjang === j} onClick={() => ubahJenjang(jenjang === j ? '' : j)}>
                      <span translate="no" className="notranslate">
                        {j}
                      </span>
                    </ChipKecil>
                  ))}
                </div>
              )}
            </div>

            {jumlah === 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-brand-300 bg-white/70 px-6 py-8 text-center" data-hanya-js="">
                <h4 className="font-display text-base font-bold text-ink">{t('kosongJudul')}</h4>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{t('kosongPesan')}</p>
                <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  {adaFilter && (
                    <button
                      type="button"
                      onClick={hapusFilter}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                    >
                      {t('hapusFilter')}
                    </button>
                  )}
                  {urlWhatsApp && (
                    <a
                      href={urlWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1ea952] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/25"
                    >
                      <i className="fa-brands fa-whatsapp text-lg leading-none" aria-hidden="true" />
                      {t('kosongWhatsApp')}
                    </a>
                  )}
                  <Link
                    href="/kontak"
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                  >
                    {t('kosongKontak')}
                  </Link>
                </div>
              </div>
            )}

            {/* Satu kelompok per fakultas; FR-60: padding bawah di HP agar aksi baris terakhir tidak tertutup tombol melayang. */}
            <div className="mt-2 pb-24 md:pb-0">
              {fakultasUrut.map((f) => {
                const butir = perFakultas.get(f._id) ?? [];
                const terlihat = butir.filter((b) => tampil.has(b.prodi._id));
                const grupTampil = modeSemua ? terlihat.length > 0 : fakultasId === f._id;
                return (
                  <section key={f._id} data-grup-fakultas={f._id} hidden={!grupTampil} aria-labelledby={`grup-${f._id}`}>
                    <h4
                      id={`grup-${f._id}`}
                      data-judul-grup=""
                      hidden={!modeSemua}
                      // [&[hidden]]:hidden: kelas display (flex) tidak boleh mengalahkan atribut hidden.
                      className="mt-4 flex items-center gap-2 border-b border-brand-100 pb-2 text-xs font-bold uppercase tracking-widest [&[hidden]]:hidden"
                      style={{ color: darkenToAA(normalisasiHex(f.warna)) }}
                    >
                      <span className="h-3 w-1 rounded-lg" style={{ backgroundColor: normalisasiHex(f.warna) }} aria-hidden="true" />
                      {t('judulGrup', { nama: f.nama })}
                    </h4>
                    <ul className="mt-3 grid gap-3">
                      {butir.map(({ prodi }) => (
                        <ProgramStudiBaris key={prodi._id} prodi={prodi} tampilkanFakultas={false} hidden={!tampil.has(prodi._id)} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TombolFakultas({
  aktif,
  onClick,
  warna,
  idPanel,
  singkatan,
  nama,
  jumlah,
  jenjang,
  semua = false,
}: {
  aktif: boolean;
  onClick: () => void;
  warna: string | undefined;
  idPanel: string;
  singkatan: string;
  nama: string;
  jumlah: number;
  jenjang: string[];
  semua?: boolean;
}) {
  const t = useTranslations('prodiExplorer');
  const dasar = normalisasiHex(warna);
  const teksWarna = darkenToAA(dasar);
  // F1: tombol aktif selalu hijau brand #063F2A dengan teks putih.
  const gaya = aktif
    ? { backgroundColor: '#063F2A', borderColor: '#063F2A', color: '#ffffff' }
    : semua
      ? undefined
      : { borderColor: withAlpha(dasar, 0.35) };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      aria-controls={idPanel}
      className={cn(
        'group relative flex w-full flex-col items-start gap-1 rounded-lg border border-ln/70 bg-white p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 min-h-[120px] lg:min-h-0 lg:border-transparent lg:py-2.5 lg:pl-4 lg:pr-3',
        semua && 'order-last lg:order-first',
        !aktif && 'hover:border-brand-300 lg:hover:bg-brand-50/70 hover:bg-brand-50/50',
      )}
      style={gaya}
    >
      <span
        className="absolute left-0 top-3 hidden h-[calc(100%-1.5rem)] w-1 rounded-r-full md:block"
        style={{ backgroundColor: aktif ? 'rgba(255,255,255,0.6)' : dasar }}
        aria-hidden="true"
      />
      <span className="flex w-full flex-col lg:flex-row lg:items-center lg:gap-3">
        <span
          translate={semua ? undefined : 'no'}
          className={cn('font-display font-extrabold leading-none lg:hidden', semua ? 'text-4xl' : 'notranslate text-2xl')}
          style={aktif ? { color: '#ffffff' } : { color: teksWarna }}
        >
          {singkatan}
        </span>
        <span
          className={cn(
            'absolute right-3 top-3 inline-flex min-w-6 items-center justify-center rounded-lg px-1.5 text-[11px] font-bold tabular-nums md:order-last lg:static lg:shrink-0',
            aktif ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-700',
          )}
          aria-label={t('jumlahProdi', { n: jumlah })}
        >
          {jumlah}
        </span>
        <span className={cn('mt-3 text-sm font-semibold leading-snug lg:mt-0 lg:min-w-0 lg:flex-1', aktif ? 'text-white' : 'text-ink')}>{nama}</span>
        {!semua && jenjang.length > 0 && (
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide lg:hidden', aktif ? 'text-white/80' : 'text-ink-muted')}>
            <span className="sr-only">{t('jenjangTersedia')}: </span>
            <span translate="no" className="notranslate">
              {jenjang.join(' · ')}
            </span>
          </span>
        )}
      </span>
    </button>
  );
}

function ChipKecil({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={cn(
        'inline-flex min-h-9 items-center rounded-lg border px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25',
        aktif ? 'border-brand-700 bg-brand-700 text-white' : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
      )}
    >
      {children}
    </button>
  );
}
