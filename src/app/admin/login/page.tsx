'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeNextPath } from '@/lib/safeNext';
import LangkahKode from './_components/LangkahKode';
import LangkahDaftar from './_components/LangkahDaftar';
import KodePemulihan from './_components/KodePemulihan';
import { PesanGalat, type HasilKembali } from './_components/shared';

export const dynamic = 'force-dynamic';

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, opts: { sitekey: string }) => number;
      getResponse: (id: number) => string;
      reset: (id: number) => void;
    };
    __onGrecaptchaLoad?: () => void;
  }
}

// Alur login (FR-01–FR-08): kredensial → kode MFA (akun sudah MFA) atau pendaftaran MFA (belum)
// → tampilan kode pemulihan sekali → dashboard. Semua langkah di /admin/login sehingga proxy tidak
// perlu diubah. Sesi baru terbit setelah langkah MFA selesai.
type Langkah = 'kredensial' | 'kode' | 'daftar' | 'pemulihan' | 'info-pemulihan';

const PETUNJUK_CAPTCHA = 'Selesaikan verifikasi "Saya bukan robot" di bawah, lalu tekan Masuk lagi.';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [langkah, setLangkah] = useState<Langkah>('kredensial');
  const [kodePemulihan, setKodePemulihan] = useState<string[]>([]);
  const [sisaPemulihan, setSisaPemulihan] = useState<number | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const infoRef = useRef<HTMLHeadingElement>(null);

  // Fokus mengikuti perubahan langkah (efek berjalan setelah render, saat form sudah tampil lagi).
  const fokusEmail = useRef(false);
  useEffect(() => {
    if (langkah === 'info-pemulihan') infoRef.current?.focus();
    if (langkah === 'kredensial' && fokusEmail.current) {
      fokusEmail.current = false;
      emailRef.current?.focus();
    }
  }, [langkah]);

  // Captcha baru muncul setelah server meminta (captchaRequired); skrip Google dimuat saat itu juga.
  const [captchaKey, setCaptchaKey] = useState<string | null>(null);
  const rcContainerRef = useRef<HTMLDivElement>(null);
  const rcWidgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!captchaKey) return;

    function renderWidget() {
      if (!rcContainerRef.current || rcWidgetId.current !== null) return;
      rcWidgetId.current = window.grecaptcha.render(rcContainerRef.current, {
        sitekey: captchaKey as string,
      });
    }

    if (window.grecaptcha?.render !== undefined) {
      renderWidget();
      return;
    }

    window.__onGrecaptchaLoad = renderWidget;

    if (!document.getElementById('recaptcha-script')) {
      const s = document.createElement('script');
      s.id = 'recaptcha-script';
      s.src = 'https://www.google.com/recaptcha/api.js?onload=__onGrecaptchaLoad&render=explicit';
      s.async = true;
      document.head.appendChild(s);
    }
  }, [captchaKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    let recaptchaToken = '';
    if (captchaKey && rcWidgetId.current !== null) {
      recaptchaToken = window.grecaptcha.getResponse(rcWidgetId.current);
      if (!recaptchaToken) {
        setErr('Selesaikan verifikasi "Saya bukan robot" terlebih dahulu.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken: recaptchaToken || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const pesan = data.error || 'Login gagal';
        if (data.captchaRequired && data.siteKey) {
          // Server baru menuntut captcha: jelaskan bahwa verifikasi kini diperlukan (FR-03).
          setErr(captchaKey ? pesan : `${pesan}. ${PETUNJUK_CAPTCHA}`);
          setCaptchaKey(data.siteKey);
        } else {
          setErr(pesan);
        }
        // Token captcha sekali pakai: ulangi verifikasi setelah gagal.
        if (rcWidgetId.current !== null) window.grecaptcha.reset(rcWidgetId.current);
        return;
      }
      // Password benar: lanjut ke langkah MFA. Password tidak disimpan lebih lama dari perlu.
      // Token captcha sudah dipakai server; kosongkan widget agar tidak terkirim ulang nanti.
      if (rcWidgetId.current !== null) window.grecaptcha.reset(rcWidgetId.current);
      setPassword('');
      setShowPass(false);
      setLangkah(data.tahap === 'verifikasi' ? 'kode' : 'daftar');
    } catch {
      setErr('Terjadi kesalahan jaringan. Periksa koneksi Anda.');
    } finally {
      setLoading(false);
    }
  }

  function masukDashboard() {
    // Hanya path internal /admin (cegah open redirect, FR-15).
    router.push(safeNextPath(nextParam, window.location.origin));
    router.refresh();
  }

  // Token pre-auth berakhir/hangus atau pengguna memilih kembali: ulangi dari email & password.
  const kembaliKeKredensial = useCallback(
    (hasil: HasilKembali) => {
      setLangkah('kredensial');
      setPassword('');
      const captcha = Boolean(hasil.captchaRequired && hasil.siteKey);
      // FR-03: bila captcha kini wajib, pesan menjelaskan bahwa verifikasi diperlukan.
      setErr(hasil.pesan ? (captcha ? `${hasil.pesan} ${PETUNJUK_CAPTCHA}` : hasil.pesan) : null);
      if (captcha) setCaptchaKey(hasil.siteKey!);
      if (rcWidgetId.current !== null) window.grecaptcha.reset(rcWidgetId.current);
      fokusEmail.current = true;
    },
    [],
  );

  // Pengguna membatalkan langkah MFA: hapus cookie pre-auth di server dulu (logout juga menghapus
  // MFA_COOKIE), agar token tidak bisa dipakai orang lain di browser yang sama selama sisa 5 menit.
  const batalkanMfa = useCallback(async () => {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setLoading(false);
    kembaliKeKredensial({ pesan: '' });
  }, [kembaliKeKredensial]);

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-[#F2F5F0]">
      {/* ── Left branding panel (split desktop & top banner mobile) ── */}
      <div className="relative w-full lg:w-1/2 min-h-[340px] sm:min-h-[380px] lg:min-h-0 flex flex-col justify-end lg:justify-between overflow-hidden bg-[#06281D] text-white p-6 sm:p-8 lg:p-12 xl:p-16 shrink-0">
        {/* Foto kampus dengan overlay hijau gelap */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/pmb unjani.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#06281D]/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06281D] via-[#063F2A]/45 to-[#06281D]/65" />
        </div>

        {/* Logo sudut atas (tampil di desktop sesuai varian desktop) */}
        <div className="relative z-10 hidden lg:flex items-center gap-3">
          <Image
            src="/logo-pmb-unjani (1).png"
            alt="Logo PMB UNJANI"
            width={44}
            height={44}
            className="h-11 w-auto object-contain drop-shadow"
            priority
          />
          <div>
            <span className="block font-display text-sm font-bold tracking-wide text-white leading-tight">
              PMB UNJANI
            </span>
            <span className="block text-xs text-white/80">Panel Admin</span>
          </div>
        </div>

        {/* Konten teks panel kiri */}
        <div className="relative z-10 py-2 sm:py-4 lg:py-0">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-3xl xl:text-[40px] xl:leading-[1.15] font-bold leading-tight text-white">
            Kelola informasi PMB dari satu tempat
          </h1>
          <p className="mt-2 lg:mt-4 text-xs sm:text-sm lg:text-base text-white/90 leading-relaxed max-w-lg xl:max-w-xl">
            Pengumuman, artikel, jadwal, dan biaya pendidikan langsung tampil untuk calon mahasiswa.
          </p>

          {/* 3 Poin Fitur (Desktop) */}
          <div className="mt-8 hidden lg:flex flex-col gap-4">
            {[
              {
                label: 'Multi Jalur Seleksi',
                sub: 'Reguler, Prestasi, Beasiswa',
              },
              {
                label: 'Jadwal Terintegrasi',
                sub: 'Pantau gelombang pendaftaran real-time',
              },
              {
                label: 'Informasi Biaya Transparan',
                sub: 'Biaya per prodi & kelas tersedia lengkap',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37] text-[#063F2A] shadow-sm">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-snug">{item.label}</p>
                  <p className="text-xs text-[#D9EADC] leading-tight">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right side: login form & MFA flows ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 lg:px-12 xl:px-16 bg-[#F2F5F0]">
        <div className="w-full max-w-md">
          {langkah === 'kode' && (
            <LangkahKode
              email={email}
              onKembali={kembaliKeKredensial}
              onBatal={batalkanMfa}
              onSukses={(sisa) => {
                if (sisa === null) return masukDashboard();
                setSisaPemulihan(sisa);
                setLangkah('info-pemulihan');
              }}
            />
          )}

          {langkah === 'daftar' && (
            <LangkahDaftar
              onKembali={kembaliKeKredensial}
              onBatal={batalkanMfa}
              onSelesai={(kode) => {
                setKodePemulihan(kode);
                setLangkah('pemulihan');
              }}
            />
          )}

          {langkah === 'pemulihan' && (
            <KodePemulihan kode={kodePemulihan} email={email} onLanjut={masukDashboard} />
          )}

          {langkah === 'info-pemulihan' && (
            <div className="space-y-5">
              <div>
                <h2 ref={infoRef} tabIndex={-1} className="font-display text-2xl font-bold text-ink outline-none">
                  Masuk dengan kode pemulihan
                </h2>
                <p className="text-sm text-ink-muted mt-1">
                  Kode yang baru dipakai sudah tidak berlaku. Sisa kode pemulihan Anda:{' '}
                  <strong className="text-ink">{sisaPemulihan}</strong>.
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                {sisaPemulihan === 0
                  ? 'Kode pemulihan Anda sudah habis. Segera minta superadmin mereset MFA atau buat set kode baru.'
                  : 'Bila HP atau aplikasi authenticator Anda hilang, minta superadmin mereset MFA agar Anda bisa mendaftar ulang.'}
              </div>
              <button
                type="button"
                onClick={masukDashboard}
                className="relative w-full overflow-hidden rounded-lg bg-[#063F2A] hover:bg-[#10281D] py-3 text-sm font-semibold text-white transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#063F2A]"
              >
                Lanjut ke dashboard
              </button>
            </div>
          )}

          {/* Form kredensial tetap terpasang (disembunyikan) selama langkah MFA agar widget
              reCAPTCHA tidak hilang saat pengguna dikembalikan ke langkah ini. */}
          <div hidden={langkah !== 'kredensial'}>
            {/* Form header */}
            <div className="mb-6 lg:mb-8">
              <h2 className="font-display text-2xl lg:text-3xl font-bold text-ink tracking-tight">
                Selamat datang
              </h2>
              <p className="text-sm text-ink-muted mt-1.5">
                Masuk dengan akun admin untuk mengelola konten PMB UNJANI.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 lg:space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2"
                >
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  required
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'galat-login' : undefined}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border border-[#CBD9CD] bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-[#063F2A] focus:ring-2 focus:ring-[#063F2A]/40 outline-none transition"
                  placeholder="admin@unjani.ac.id"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? 'galat-login' : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-[#CBD9CD] bg-white pl-4 pr-24 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-[#063F2A] focus:ring-2 focus:ring-[#063F2A]/40 outline-none transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink hover:text-[#063F2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#063F2A] rounded px-1.5 py-1 transition-colors"
                    aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                    aria-pressed={showPass}
                  >
                    {showPass ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA: hanya setelah server memintanya */}
              {captchaKey && (
                <div className="flex justify-start pt-1">
                  <div ref={rcContainerRef} />
                </div>
              )}

              {/* Error */}
              <PesanGalat pesan={err} id="galat-login" />

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="relative w-full rounded-lg bg-[#D4AF37] hover:bg-[#C4A030] py-3.5 text-base font-semibold text-[#1D2114] disabled:opacity-60 transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#063F2A] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span role="status">Memproses...</span>
                  </>
                ) : (
                  <span>Masuk →</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs sm:text-sm text-ink-muted">
                Lupa password? Hubungi superadmin PMB.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#CBD9CD]/60 text-center">
              <p className="text-xs text-ink-muted">
                © {new Date().getFullYear()} Universitas Jenderal Achmad Yani
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
