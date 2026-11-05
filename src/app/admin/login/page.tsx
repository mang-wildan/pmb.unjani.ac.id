'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeNextPath } from '@/lib/safeNext';
import LangkahKode from './_components/LangkahKode';
import LangkahDaftar from './_components/LangkahDaftar';
import KodePemulihan from './_components/KodePemulihan';
import { PesanGalat, TombolUtama, type HasilKembali } from './_components/shared';

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
    <main className="min-h-screen flex">
      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-brand flex-col items-center justify-center px-12 py-16">
        {/* Background blobs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-12 h-48 w-48 -translate-y-1/2 rounded-full bg-white/5" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <Image
            src="/logo-pmb-unjani (1).png"
            alt="Logo PMB UNJANI"
            width={100}
            height={100}
            className="mb-6 drop-shadow-2xl"
          />
          <h1 className="font-display text-4xl font-bold text-white leading-tight mb-3">
            PMB UNJANI
          </h1>
          <p className="text-brand-100 text-base leading-relaxed mb-10">
            Universitas Jenderal Achmad Yani
            <br />
            Sistem Penerimaan Mahasiswa Baru
          </p>

          <div className="w-full space-y-3 text-left">
            {[
              { icon: '🎓', label: 'Multi Jalur Seleksi', sub: 'Reguler, Prestasi, Beasiswa' },
              { icon: '📅', label: 'Jadwal Terintegrasi', sub: 'Pantau gelombang pendaftaran real-time' },
              { icon: '💳', label: 'Informasi Biaya Transparan', sub: 'Biaya per prodi & kelas tersedia lengkap' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-xl mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-brand-200">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 text-xs text-brand-300">
          © {new Date().getFullYear()} Universitas Jenderal Achmad Yani · Cimahi
        </p>
      </div>

      {/* ── Right: login form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white lg:bg-gray-50/50">
        <div className="w-full max-w-sm">
          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logo-pmb-unjani (1).png"
              alt="Logo PMB UNJANI"
              width={64}
              height={64}
              className="mx-auto mb-3"
            />
            <h1 className="font-display text-xl font-bold text-ink">PMB UNJANI</h1>
          </div>

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
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                {sisaPemulihan === 0
                  ? 'Kode pemulihan Anda sudah habis. Segera minta superadmin mereset MFA atau buat set kode baru.'
                  : 'Bila HP atau aplikasi authenticator Anda hilang, minta superadmin mereset MFA agar Anda bisa mendaftar ulang.'}
              </div>
              <TombolUtama type="button" onClick={masukDashboard}>
                Lanjut ke dashboard
              </TombolUtama>
            </div>
          )}

          {/* Form kredensial tetap terpasang (disembunyikan) selama langkah MFA agar widget
              reCAPTCHA tidak hilang saat pengguna dikembalikan ke langkah ini. */}
          <div hidden={langkah !== 'kredensial'}>
          {/* Form header */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-ink">Selamat datang</h2>
            <p className="text-sm text-ink-muted mt-1">
              Masuk ke panel admin untuk mengelola konten PMB.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted/60">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
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
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
                  placeholder="admin@unjani.ac.id"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted/60">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? 'galat-login' : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-12 py-3 text-sm text-ink placeholder:text-ink-muted/50 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted/50 hover:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPass}
                >
                  {showPass ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* reCAPTCHA: hanya setelah server memintanya */}
            {captchaKey && (
              <div className="flex justify-start">
                <div ref={rcContainerRef} />
              </div>
            )}

            {/* Error */}
            <PesanGalat pesan={err} id="galat-login" />

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-full bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Memproses...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
          </div>

          <p className="mt-8 text-center text-xs text-ink-muted">
            © {new Date().getFullYear()} Universitas Jenderal Achmad Yani
          </p>
        </div>
      </div>
    </main>
  );
}
