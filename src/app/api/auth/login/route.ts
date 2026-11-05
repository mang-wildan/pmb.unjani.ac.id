import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { clientIpFromHeaders } from '@/lib/http';
import { writeAuditLog } from '@/models/AuditLog';
import { catatGagal, normalisasiEmail, statusCaptcha, type StatusCaptcha } from '@/lib/loginAttempts';
import { hostnameSah, verifyRecaptcha } from '@/lib/recaptcha';
import { PESAN_LAYANAN, batasiPercobaan, infoCaptcha, konteksLog, responsPreAuth } from '@/lib/alurLogin';

export const runtime = 'nodejs';

// Login admin langkah 1: email + password (+ captcha bila wajib). FR-01 s.d. FR-05, FR-24, FR-25.
// Password benar TIDAK menerbitkan sesi, melainkan token pre-auth untuk langkah MFA (FR-06, FR-07):
// tahap 'verifikasi' bila MFA aktif, 'daftar' bila belum. Pesan ke pengguna selalu generik; alasan
// sebenarnya hanya dicatat di Log Aktivitas.

const schema = z.object({
  email: z.string().email().max(160),
  // Kebijakan password (FR-26) sengaja tidak diterapkan di sini agar akun lama tetap bisa masuk.
  password: z.string().min(1).max(200),
  recaptchaToken: z.string().max(4096).optional(),
});

const PESAN_SALAH = 'Email atau password salah';
const PESAN_CAPTCHA = 'Terlalu banyak percobaan gagal. Selesaikan verifikasi "Saya bukan robot" lalu coba lagi.';
const PESAN_CAPTCHA_GAGAL = 'Verifikasi "Saya bukan robot" tidak valid atau kedaluwarsa. Ulangi verifikasi.';
const PESAN_GOOGLE = 'Layanan verifikasi tidak dapat dihubungi. Coba lagi beberapa saat lagi.';
const PESAN_KONFIG = 'Verifikasi tidak dapat dilakukan saat ini. Hubungi administrator.';

/**
 * Hash bcrypt (cost 12) dari nilai acak yang dibuang. Dibandingkan saat email tidak terdaftar,
 * sehingga waktu respons sama dengan email terdaftar (FR-25).
 */
const HASH_DUMMY = '$2a$12$Uz3T8jXoUuCXhJnbZLVMCeac3.cy14bDGCBSsU66JjRS4wiKyYh/e';

async function catatLoginGagal(
  req: Request,
  ip: string,
  email: string,
  alasan: string,
  userId?: unknown,
) {
  await writeAuditLog({
    userId: userId ? String(userId) : undefined,
    email,
    aksi: 'login_gagal',
    entitas: 'AdminUser',
    entitasId: userId ? String(userId) : '',
    ringkasan: `Login gagal: ${alasan}`,
    ...konteksLog(req, ip),
  });
}

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  const dibatasi = await batasiPercobaan(req, ip, 'login');
  if (dibatasi) return dibatasi;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email / password tidak valid' }, { status: 400 });
  }
  const email = normalisasiEmail(parsed.data.email);
  const { password, recaptchaToken } = parsed.data;

  try {
    await connectDb();
    const rc = await infoCaptcha();
    const captchaAktif = rc.aktif;

    // Bentuk respons gagal yang konsisten: halaman login tahu kapan harus menampilkan captcha.
    const gagal = (status: number, error: string, s: StatusCaptcha | null) => {
      const wajib = captchaAktif && Boolean(s?.wajib);
      return NextResponse.json(
        { error, captchaRequired: wajib, ...(wajib ? { siteKey: rc.siteKey } : {}) },
        { status },
      );
    };

    // 1. Captcha bersyarat: hanya wajib setelah ambang gagal untuk email ATAU IP (FR-01).
    if (captchaAktif) {
      const status = await statusCaptcha(email, ip);
      if (status.wajib) {
        if (!recaptchaToken) {
          // Password belum diperiksa: tidak menambah penghitung (FR-02).
          await catatLoginGagal(req, ip, email, 'captcha wajib tetapi tidak dikirim');
          return gagal(400, PESAN_CAPTCHA, status);
        }
        const hasil = await verifyRecaptcha({
          secretKey: rc.secretKey,
          token: recaptchaToken,
          ip,
          hostnameSah: hostnameSah(req.headers),
        });
        if (hasil !== 'ok') {
          const alasan = {
            invalid: 'captcha tidak valid',
            unavailable: 'layanan reCAPTCHA tidak dapat dihubungi',
            misconfigured: 'konfigurasi reCAPTCHA tidak lengkap/salah',
          }[hasil];
          await catatLoginGagal(req, ip, email, alasan);
          if (hasil === 'unavailable') return gagal(503, PESAN_GOOGLE, status);
          if (hasil === 'misconfigured') return gagal(503, PESAN_KONFIG, status);
          return gagal(400, PESAN_CAPTCHA_GAGAL, status);
        }
      }
    }

    // 2. Periksa password. Selalu tepat satu perbandingan bcrypt, termasuk saat email tidak
    //    terdaftar (hash dummy), agar waktu respons tidak membocorkan email terdaftar (FR-25).
    const user = await AdminUser.findOne({ email }).select('+passwordHash');
    const passwordBenar = user
      ? await user.verifyPassword(password)
      : await bcrypt.compare(password, HASH_DUMMY);

    if (!user || !passwordBenar || user.aktif !== true) {
      const alasan = !user ? 'email tidak terdaftar' : !passwordBenar ? 'password salah' : 'akun nonaktif';
      const terbaru = await catatGagal(email, ip);
      await catatLoginGagal(req, ip, email, alasan, user?._id);
      return gagal(401, PESAN_SALAH, terbaru);
    }

    // 3. Password benar: lanjut ke langkah MFA. Penghitung email baru direset setelah langkah MFA
    //    selesai (terbitkanSesi), agar kode MFA yang salah tetap terhitung (FR-02, FR-07).
    return responsPreAuth(user, user.mfaAktif === true ? 'verifikasi' : 'daftar');
  } catch (error) {
    // Database (penghitung, akun, pengaturan) gagal: tolak, jangan loloskan.
    console.error('[login] layanan gagal:', error);
    return NextResponse.json({ error: PESAN_LAYANAN }, { status: 503 });
  }
}
