'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import TrackedAnalyticsLink from './TrackedAnalyticsLink';

type StatusChat =
  | 'answered'
  | 'clarification_needed'
  | 'no_source'
  | 'out_of_scope'
  | 'temporarily_unavailable';
type Sumber = { judul: string; url: string };
type Pesan = { id: string; peran: 'user' | 'assistant'; isi: string; sumber: Sumber[]; status?: StatusChat; kontak?: boolean };
type Kepuasan = 'ya' | 'belum' | null;
type Sesi = { pesan: Pesan[]; balasan: number; kepuasan: Kepuasan };

type Props = {
  pesanPembuka: string;
  ambangPuasTanya: number;
  whatsappUrl: string | null;
};

const KUNCI_SESI = 'pmb-chat-admisi:v1';
const BATAS_PESAN_SESI = 60;
const BATAS_PESAN_KIRIM = 12;
const BATAS_KARAKTER_KIRIM = 4000;
const SEMUA_STATUS: StatusChat[] = [
  'answered',
  'clarification_needed',
  'no_source',
  'out_of_scope',
  'temporarily_unavailable',
];
/** Status yang langsung menawarkan kontak tanpa menunggu ambang kepuasan. */
const STATUS_KONTAK: StatusChat[] = ['no_source', 'out_of_scope', 'temporarily_unavailable'];

function idBaru(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function urlAman(nilai: unknown): string | null {
  if (typeof nilai !== 'string' || nilai.length > 2000) return null;
  if (/^\/(?!\/)/.test(nilai) && !/[\\\s]/.test(nilai)) return nilai;
  try {
    const url = new URL(nilai);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseSumber(nilai: unknown): Sumber[] {
  if (!Array.isArray(nilai)) return [];
  const hasil: Sumber[] = [];
  for (const item of nilai.slice(0, 5)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const data = item as Record<string, unknown>;
    const judul = typeof data.judul === 'string' ? data.judul.trim().slice(0, 200) : '';
    const url = urlAman(data.url);
    if (judul && url && !hasil.some((s) => s.url === url)) hasil.push({ judul, url });
  }
  return hasil;
}

/** Validasi defensif respons POST /api/chat; JANGAN percaya bentuknya. */
function parseBalasan(
  nilai: unknown,
): { jawaban: string; sumber: Sumber[]; status: StatusChat; kontak: boolean } | null {
  if (!nilai || typeof nilai !== 'object' || Array.isArray(nilai)) return null;
  const data = nilai as Record<string, unknown>;
  const jawaban = typeof data.jawaban === 'string' ? data.jawaban.trim().slice(0, 4000) : '';
  const status =
    typeof data.status === 'string' && SEMUA_STATUS.includes(data.status as StatusChat)
      ? (data.status as StatusChat)
      : null;
  if (!jawaban || !status || !Array.isArray(data.sumber) || typeof data.tawarkanWhatsApp !== 'boolean') return null;
  return {
    jawaban,
    sumber: parseSumber(data.sumber),
    status,
    kontak: data.tawarkanWhatsApp || STATUS_KONTAK.includes(status),
  };
}

function parseSesi(mentah: string | null): Sesi {
  const kosong: Sesi = { pesan: [], balasan: 0, kepuasan: null };
  if (!mentah) return kosong;
  try {
    const data = JSON.parse(mentah) as Record<string, unknown>;
    const pesan: Pesan[] = Array.isArray(data.pesan)
      ? data.pesan
          .slice(-BATAS_PESAN_SESI)
          .map((item): Pesan | null => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
            const p = item as Record<string, unknown>;
            const isi = typeof p.isi === 'string' ? p.isi.trim().slice(0, 4000) : '';
            if (!isi || (p.peran !== 'user' && p.peran !== 'assistant')) return null;
            const status =
              typeof p.status === 'string' && SEMUA_STATUS.includes(p.status as StatusChat)
                ? (p.status as StatusChat)
                : undefined;
            return {
              id: typeof p.id === 'string' && p.id ? p.id : idBaru(),
              peran: p.peran,
              isi,
              sumber: p.peran === 'assistant' ? parseSumber(p.sumber) : [],
              status,
              kontak: p.kontak === true,
            };
          })
          .filter((p): p is Pesan => p !== null)
      : [];
    const balasan =
      typeof data.balasan === 'number' && Number.isInteger(data.balasan)
        ? Math.min(1000, Math.max(0, data.balasan))
        : 0;
    const kepuasan = data.kepuasan === 'ya' || data.kepuasan === 'belum' ? data.kepuasan : null;
    return { pesan, balasan, kepuasan };
  } catch {
    return kosong;
  }
}

/** Riwayat untuk server: maks 12 pesan, 4000 karakter total, 500 per pesan. */
function riwayatUntukDikirim(pesan: Pesan[]): Array<{ peran: 'user' | 'assistant'; isi: string }> {
  const hasil: Array<{ peran: 'user' | 'assistant'; isi: string }> = [];
  let total = 0;
  for (let i = pesan.length - 1; i >= 0 && hasil.length < BATAS_PESAN_KIRIM; i--) {
    const p = pesan[i];
    const isi = String(p.isi ?? '').trim().slice(0, 500);
    if (!isi) continue;
    if (total + isi.length > BATAS_KARAKTER_KIRIM) break;
    total += isi.length;
    hasil.unshift({ peran: p.peran, isi });
  }
  return hasil;
}

export default function ChatWidget({ pesanPembuka, ambangPuasTanya, whatsappUrl }: Props) {
  const t = useTranslations('chatbot');
  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [balasan, setBalasan] = useState(0);
  const [kepuasan, setKepuasan] = useState<Kepuasan>(null);
  const [teks, setTeks] = useState('');
  const [menunggu, setMenunggu] = useState(false);
  const [siap, setSiap] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const akhirRef = useRef<HTMLDivElement>(null);
  const fokusLauncherRef = useRef(false);
  const fokusKepuasanRef = useRef(false);
  const ambang = Math.min(10, Math.max(1, Math.round(Number(ambangPuasTanya) || 3)));
  const urlWhatsApp = urlAman(whatsappUrl);

  // Riwayat hanya di sessionStorage: tidak ada persistensi server.
  useEffect(() => {
    try {
      const sesi = parseSesi(window.sessionStorage.getItem(KUNCI_SESI));
      setPesan(sesi.pesan);
      setBalasan(sesi.balasan);
      setKepuasan(sesi.kepuasan);
    } catch {
      // sessionStorage dapat ditolak browser; percakapan tetap berjalan di memori.
    }
    setSiap(true);
  }, []);

  useEffect(() => {
    if (!siap) return;
    try {
      window.sessionStorage.setItem(
        KUNCI_SESI,
        JSON.stringify({ pesan: pesan.slice(-BATAS_PESAN_SESI), balasan, kepuasan }),
      );
    } catch {
      // Penyimpanan opsional; abaikan bila kuota/mode privat memblokir.
    }
  }, [pesan, balasan, kepuasan, siap]);

  useEffect(() => {
    if (buka) inputRef.current?.focus();
  }, [buka]);

  // Kembalikan fokus ke launcher SETELAH panel ter-unmount; fokus langsung di handler
  // bisa hilang saat elemen yang sedang fokus dilepas dari DOM.
  useEffect(() => {
    if (!buka && fokusLauncherRef.current) {
      fokusLauncherRef.current = false;
      launcherRef.current?.focus();
    }
  }, [buka]);

  // Tombol "Ya"/"Belum" hilang setelah diklik: pindahkan fokus ke target berikutnya.
  useEffect(() => {
    if (!fokusKepuasanRef.current) return;
    fokusKepuasanRef.current = false;
    if (kepuasan === 'ya') {
      inputRef.current?.focus();
    } else if (kepuasan === 'belum') {
      panelRef.current?.querySelector<HTMLAnchorElement>('[data-fokus-kepuasan="true"]')?.focus();
    }
  }, [kepuasan]);

  useEffect(() => {
    if (!buka) return;
    const kurangiGerak = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    akhirRef.current?.scrollIntoView({ behavior: kurangiGerak ? 'auto' : 'smooth', block: 'nearest' });
  }, [buka, pesan, menunggu, kepuasan]);

  function tutup() {
    fokusLauncherRef.current = true;
    setBuka(false);
  }

  function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      tutup();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const fokus = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!fokus.length) return;
    const pertama = fokus[0];
    const terakhir = fokus[fokus.length - 1];
    const aktif = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (aktif === pertama || !panelRef.current.contains(aktif))) {
      e.preventDefault();
      terakhir.focus();
    } else if (!e.shiftKey && aktif === terakhir) {
      e.preventDefault();
      pertama.focus();
    }
  }

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isi = teks.trim();
    if (!isi || menunggu) return;
    const pesanUser: Pesan = { id: idBaru(), peran: 'user', isi: isi.slice(0, 500), sumber: [] };
    const riwayat = riwayatUntukDikirim(pesan);
    setPesan((lama) => [...lama, pesanUser].slice(-BATAS_PESAN_SESI));
    setTeks('');
    setMenunggu(true);

    let balasanBaru: Pesan;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesan: pesanUser.isi, riwayat }),
        signal: AbortSignal.timeout(60_000),
      });
      const data: unknown = await res.json().catch(() => null);
      const hasil = parseBalasan(data);
      balasanBaru = hasil
        ? { id: idBaru(), peran: 'assistant', isi: hasil.jawaban, sumber: hasil.sumber, status: hasil.status, kontak: hasil.kontak }
        : { id: idBaru(), peran: 'assistant', isi: t('galatKoneksi'), sumber: [], status: 'temporarily_unavailable', kontak: true };
    } catch {
      balasanBaru = {
        id: idBaru(),
        peran: 'assistant',
        isi: t('galatKoneksi'),
        sumber: [],
        status: 'temporarily_unavailable',
        kontak: true,
      };
    }
    setPesan((lama) => [...lama, balasanBaru].slice(-BATAS_PESAN_SESI));
    // Ambang kepuasan menghitung SETIAP balasan chatbot dalam sesi, bukan hanya kegagalan.
    setBalasan((n) => n + 1);
    setMenunggu(false);
  }

  function tombolKontak(tandaiFokus = false) {
    const kelas =
      'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40';
    const dataFokus = tandaiFokus ? { 'data-fokus-kepuasan': 'true' } : {};
    if (urlWhatsApp) {
      return (
        <TrackedAnalyticsLink
          href={urlWhatsApp}
          eventName={ANALYTICS_EVENTS.whatsappClick}
          target="_blank"
          rel="noopener noreferrer"
          className={kelas}
          {...dataFokus}
        >
          <i className="fa-brands fa-whatsapp text-base leading-none" aria-hidden="true" />
          {t('ctaWhatsApp')}
        </TrackedAnalyticsLink>
      );
    }
    return (
      <Link href="/kontak" onClick={() => setBuka(false)} className={kelas} {...dataFokus}>
        <i className="fa-solid fa-envelope text-sm leading-none" aria-hidden="true" />
        {t('ctaKontak')}
      </Link>
    );
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => (buka ? tutup() : setBuka(true))}
        aria-expanded={buka}
        aria-controls="panel-chat-admisi"
        aria-label={buka ? t('tutupChat') : t('bukaChat')}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_18px_45px_rgba(6,63,42,0.32)] ring-2 ring-accent/70 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50 motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        <i
          className={`${buka ? 'fa-solid fa-xmark text-xl' : 'fa-solid fa-comment-dots text-xl'} leading-none`}
          aria-hidden="true"
        />
      </button>

      {buka && (
        <div
          aria-hidden="true"
          onClick={tutup}
          className="fixed inset-0 z-[55] bg-black/30"
        />
      )}

      {buka && (
        <div
          ref={panelRef}
          id="panel-chat-admisi"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chatbot-judul"
          onKeyDown={onPanelKeyDown}
          className="fixed inset-x-0 bottom-20 z-[60] sm:inset-x-auto sm:bottom-24 sm:right-5"
        >
          <div className="mx-auto flex h-[min(72dvh,560px)] w-full flex-col overflow-hidden rounded-t-2xl border border-ln bg-surface shadow-[0_24px_60px_rgba(6,40,29,0.28)] sm:h-[560px] sm:max-h-[calc(100dvh-7rem)] sm:w-[380px] sm:rounded-2xl">
            <div className="bg-brand text-white">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[#1D2114]">
                  <i className="fa-solid fa-headset text-sm leading-none" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="chatbot-judul" className="truncate font-display text-sm font-bold">
                    {t('judul')}
                  </h2>
                  <p className="truncate text-xs text-white/75">{t('subjudul')}</p>
                </div>
                <button
                  type="button"
                  onClick={tutup}
                  aria-label={t('tutupChat')}
                  className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <i className="fa-solid fa-xmark text-base leading-none" aria-hidden="true" />
                </button>
              </div>
              <div className="h-0.5 bg-accent" aria-hidden="true" />
            </div>

            <div
              role="log"
              aria-live="polite"
              aria-busy={menunggu}
              aria-label={t('riwayatLabel')}
              className="flex flex-1 flex-col gap-3 overflow-y-auto bg-bg px-3 py-4"
            >
              {pesanPembuka.trim() && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] whitespace-pre-line break-words rounded-lg border border-ln bg-white px-3 py-2 text-sm leading-relaxed text-ink">
                    {pesanPembuka}
                  </div>
                </div>
              )}

              {pesan.map((p) => (
                <div
                  key={p.id}
                  className={`flex flex-col ${p.peran === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={
                      p.peran === 'user'
                        ? 'max-w-[85%] whitespace-pre-line break-words rounded-lg bg-brand px-3 py-2 text-sm leading-relaxed text-white'
                        : 'max-w-[85%] whitespace-pre-line break-words rounded-lg border border-ln bg-white px-3 py-2 text-sm leading-relaxed text-ink'
                    }
                  >
                    {p.isi}
                    {p.peran === 'assistant' && p.sumber.length > 0 && (
                      <div className="mt-2 border-t border-ln pt-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                          {t('sumber')}
                        </p>
                        <ul className="space-y-1">
                          {p.sumber.map((s) => (
                            <li key={s.url}>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('bukaSumber', { judul: s.judul })}
                                className="rounded text-xs font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                              >
                                {s.judul}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {p.peran === 'assistant' && p.kontak && (
                    <div className="mt-2 max-w-[85%] rounded-lg border border-accent/60 bg-accent-50 p-3">
                      <p className="mb-2 text-xs text-ink-muted">{t('kontakHint')}</p>
                      {tombolKontak()}
                    </div>
                  )}
                </div>
              ))}

              {menunggu && (
                <div className="flex flex-col items-start">
                  <div className="rounded-lg border border-ln bg-white px-3 py-2 text-sm text-ink-muted">
                    <span className="motion-safe:animate-pulse">{t('menunggu')}</span>
                  </div>
                </div>
              )}

              {kepuasan === null && balasan >= ambang && !menunggu && (
                <div className="rounded-lg border border-ln bg-white p-3 shadow-sm">
                  <p className="text-sm font-semibold text-ink">{t('kepuasanPertanyaan')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        fokusKepuasanRef.current = true;
                        setKepuasan('ya');
                      }}
                      className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
                    >
                      {t('kepuasanYa')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fokusKepuasanRef.current = true;
                        setKepuasan('belum');
                      }}
                      className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
                    >
                      {t('kepuasanBelum')}
                    </button>
                  </div>
                </div>
              )}

              {kepuasan === 'ya' && (
                <div className="rounded-lg border border-ln bg-white p-3 text-sm text-ink-muted">
                  {t('terimaKasih')}
                </div>
              )}

              {kepuasan === 'belum' && (
                <div className="rounded-lg border border-accent/60 bg-accent-50 p-3">
                  <p className="mb-2 text-xs text-ink-muted">{t('kontakHint')}</p>
                  {tombolKontak(true)}
                </div>
              )}

              <div ref={akhirRef} />
            </div>

            <form
              onSubmit={kirim}
              className="border-t border-ln bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <label htmlFor="chatbot-input" className="sr-only">
                {t('labelInput')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="chatbot-input"
                  ref={inputRef}
                  type="text"
                  value={teks}
                  onChange={(e) => setTeks(e.target.value)}
                  maxLength={500}
                  autoComplete="off"
                  enterKeyHint="send"
                  placeholder={t('placeholderInput')}
                  aria-label={t('labelInput')}
                  className="min-w-0 flex-1 rounded-lg border border-ln bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  disabled={menunggu || !teks.trim()}
                  aria-label={t('kirim')}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-[#1D2114] hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="fa-solid fa-paper-plane text-sm leading-none" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
