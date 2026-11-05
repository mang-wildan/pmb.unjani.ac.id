'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import ProgramStudiBaris, { type ProgramStudiItem } from '@/components/public/ProgramStudiBaris';
import Reveal from '@/components/public/Reveal';
import { SectionHeading } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { darkenForWhiteText, darkenToAA, normalisasiHex, withAlpha } from '@/lib/color';
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
    if (window.matchMedia('(max-width: 767px)').matches) {
      requestAnimationFrame(() => judulPanelRef.current?.focus({ preventScroll: true }));
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
      tombol?.focus({ preventScroll: true });
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
      className="bg-gradient-to-b from-brand-50/45 via-white to-brand-50/30 py-16 scroll-mt-24"
      aria-labelledby="fakultas-heading"
    >
      <noscript dangerouslySetInnerHTML={{ __html: `<style>${GAYA_NOSCRIPT}</style>` }} />
      <div className="container mx-auto">
        <Reveal>
          <SectionHeading eyebrow={teks.eyebrow} title={teks.title} description={teks.desc} id="fakultas-heading" />
        </Reveal>

        <div className="relative mt-8" data-hanya-js="">
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
            className="h-12 w-full rounded-2xl border border-brand-100 bg-white pl-11 pr-4 text-base text-ink shadow-sm placeholder:text-ink-soft focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/20"
          />
        </div>

        <div className="mt-4 md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-6 lg:grid-cols-[300px_1fr]">
          {/* Rail (>=md) / petak dua kolom (<md). */}
          <nav
            ref={railRef}
            data-rail=""
            data-tingkat={tingkat}
            aria-label={t('navFakultas')}
            // Di layar pendek rail sticky bisa lebih tinggi dari viewport: batasi tinggi dan beri gulir dalam
            // hanya pada rail (navigasi), bukan pada panel isi.
            className="grid grid-cols-2 gap-2 max-md:data-[tingkat=prodi]:hidden md:sticky md:top-24 md:max-h-[calc(100dvh-7rem)] md:grid-cols-1 md:gap-1.5 md:overflow-y-auto md:overscroll-contain md:pr-1"
          >
            <TombolFakultas
              aktif={modeSemua}
              onClick={() => pilihFakultas(SEMUA)}
              warna={undefined}
              idPanel={idPanel}
              singkatan={t('semuaProdi')}
              nama={t('pilihFakultas')}
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
            className="mt-4 rounded-3xl border border-brand-100 bg-white p-4 shadow-soft max-md:hidden max-md:data-[tingkat=prodi]:block md:mt-0 md:p-5"
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
                <p role="status" aria-live="polite" className="mt-0.5 text-sm text-ink-muted">
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
              <div className="mt-4 rounded-2xl border border-dashed border-brand-200 px-6 py-8 text-center" data-hanya-js="">
                <h4 className="font-display text-base font-bold text-ink">{t('kosongJudul')}</h4>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{t('kosongPesan')}</p>
                <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  {adaFilter && (
                    <button
                      type="button"
                      onClick={hapusFilter}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-200 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                    >
                      {t('hapusFilter')}
                    </button>
                  )}
                  {urlWhatsApp && (
                    <a
                      href={urlWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white hover:bg-[#1ea952] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/25"
                    >
                      <i className="fa-brands fa-whatsapp text-lg leading-none" aria-hidden="true" />
                      {t('kosongWhatsApp')}
                    </a>
                  )}
                  <Link
                    href="/kontak"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-brand-200 px-5 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
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
                      <span className="h-3 w-1 rounded-full" style={{ backgroundColor: normalisasiHex(f.warna) }} aria-hidden="true" />
                      {t('judulGrup', { nama: f.nama })}
                    </h4>
                    <ul>
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
  const latarAktif = darkenForWhiteText(dasar);
  const teksWarna = darkenToAA(dasar);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      aria-controls={idPanel}
      className={cn(
        'group relative flex min-h-[72px] w-full flex-col items-start gap-1 rounded-2xl border bg-white p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 md:min-h-0 md:flex-row md:items-center md:gap-3 md:py-2.5 md:pl-4',
        semua && 'col-span-2 md:col-span-1',
        !aktif && 'hover:bg-brand-50/50',
      )}
      style={aktif ? { backgroundColor: latarAktif, borderColor: latarAktif, color: '#ffffff' } : { borderColor: withAlpha(dasar, 0.35) }}
    >
      <span
        className="absolute left-0 top-3 hidden h-[calc(100%-1.5rem)] w-1 rounded-r-full md:block"
        style={{ backgroundColor: aktif ? 'rgba(255,255,255,0.6)' : dasar }}
        aria-hidden="true"
      />
      <span className="flex w-full items-center justify-between gap-2 md:w-auto md:flex-1 md:justify-start">
        <span
          translate={semua ? undefined : 'no'}
          className={cn('font-display text-base font-extrabold leading-none md:min-w-[3.5rem]', semua ? 'text-sm md:text-[13px]' : 'notranslate')}
          style={aktif ? undefined : { color: teksWarna }}
        >
          {singkatan}
        </span>
        <span
          className={cn(
            'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums md:order-last',
            aktif ? 'bg-black/25 text-white' : 'bg-brand-50 text-brand-700',
          )}
          aria-label={t('jumlahProdi', { n: jumlah })}
        >
          {jumlah}
        </span>
      </span>
      <span className={cn('line-clamp-2 text-xs leading-snug md:flex-1', semua && 'md:hidden', aktif ? 'text-white' : 'text-ink')}>{nama}</span>
      {!semua && jenjang.length > 0 && (
        <span className={cn('text-[10px] font-semibold uppercase tracking-wide md:hidden', aktif ? 'text-white' : 'text-ink-muted')}>
          <span className="sr-only">{t('jenjangTersedia')}: </span>
          <span translate="no" className="notranslate">
            {jenjang.join(' · ')}
          </span>
        </span>
      )}
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
        'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25',
        aktif ? 'border-brand-700 bg-brand-700 text-white' : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
      )}
    >
      {children}
    </button>
  );
}
