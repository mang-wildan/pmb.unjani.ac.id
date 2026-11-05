import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { toDataURL } from 'qrcode';
import { AdminUser } from '@/models/AdminUser';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';
import { hasValidCsrfOrigin } from '@/lib/csrf';
import { buatRahasia, formatKunciManual, uriOtpauth, verifikasiTotp, PENERBIT } from '@/lib/totp';
import { SecretCryptoError, dekripsiRahasia, enkripsiRahasia, pastikanKunciEnkripsi } from '@/lib/secretCrypto';
import { buatKodePemulihan } from '@/lib/recoveryCodes';
import type { PreAuthClaims } from '@/lib/auth';
import {
  PESAN_LAYANAN,
  PESAN_PREAUTH_BERAKHIR,
  bacaPreAuth,
  batasiPercobaan,
  konteksLog,
  responsKembaliKePassword,
  terbitkanSesi,
} from '@/lib/alurLogin';

export const runtime = 'nodejs';

// Pendaftaran MFA wajib (FR-06, FR-08, FR-10) dengan token pre-auth tahap 'daftar':
// - GET: buat rahasia baru, simpan terenkripsi (mfaAktif tetap false), kirim QR + kunci manual.
//   Rahasia hanya pernah dikirim di respons ini.
// - POST: verifikasi satu kode TOTP → MFA aktif, 10 kode pemulihan (dikirim SEKALI), sesi terbit.

const schema = z.object({ kode: z.string().min(1).max(32) });

const PESAN_KUNCI = 'Pendaftaran MFA belum dapat dilakukan karena konfigurasi server belum lengkap. Hubungi administrator.';
const PESAN_FORMAT = 'Masukkan 6 digit kode dari aplikasi authenticator.';
const PESAN_SALAH = 'Kode tidak cocok. Pastikan jam HP tepat, lalu masukkan kode yang sedang tampil.';
const PESAN_MULAI_ULANG = 'Kode QR sudah tidak berlaku. Muat ulang langkah pendaftaran lalu pindai QR yang baru.';

/** Header untuk respons yang memuat rahasia atau kode pemulihan: jangan pernah disimpan cache. */
const TANPA_CACHE = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' };

/**
 * Rahasia yang belum diaktifkan diikat ke token pre-auth yang membuatnya (AAD). Rahasia tertunda
 * dari percobaan lain (mis. penyerang yang tahu password lalu berhenti di tengah) tidak dapat
 * diaktifkan dengan token baru, dan sebaliknya.
 */
function konteksTertunda(klaim: PreAuthClaims) {
  return `${klaim.sub}:daftar:${klaim.tm}`;
}

function galatKunci(error: unknown) {
  if (!(error instanceof SecretCryptoError)) throw error;
  console.error('[mfa-daftar] kunci enkripsi tidak siap:', error.message);
  return NextResponse.json({ error: PESAN_KUNCI }, { status: 503, headers: TANPA_CACHE });
}

export async function GET(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  const dibatasi = await batasiPercobaan(req, ip, 'daftar');
  if (dibatasi) return dibatasi;
  // GET ini mengubah data (rahasia baru). Tolak navigasi lintas situs; cookie SameSite=Lax tetap
  // terkirim pada navigasi tingkat atas, jadi cek Fetch Metadata bila browser mengirimnya.
  const situs = req.headers.get('sec-fetch-site');
  if (situs && situs !== 'same-origin') {
    return NextResponse.json({ error: 'Permintaan ditolak' }, { status: 403 });
  }

  try {
    pastikanKunciEnkripsi();
  } catch (error) {
    return galatKunci(error);
  }

  try {
    const pre = await bacaPreAuth(req, 'daftar');
    if (!pre) return responsKembaliKePassword(PESAN_PREAUTH_BERAKHIR, 401);
    const { klaim, user } = pre;

    const rahasia = buatRahasia();
    let tersimpan: string;
    try {
      tersimpan = enkripsiRahasia(rahasia, konteksTertunda(klaim));
    } catch (error) {
      return galatKunci(error);
    }
    const simpan = await AdminUser.updateOne(
      { _id: user._id, mfaAktif: { $ne: true } },
      { $set: { mfaRahasia: tersimpan, mfaPeriodeTerakhir: null, mfaKodePemulihan: [] } },
    );
    if (simpan.matchedCount !== 1) return responsKembaliKePassword(PESAN_PREAUTH_BERAKHIR, 401);

    const uri = uriOtpauth(rahasia, user.email);
    const qr = await toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
    return NextResponse.json(
      {
        qr,
        uri,
        kunciManual: formatKunciManual(rahasia),
        akun: user.email,
        penerbit: PENERBIT,
        // Batas waktu langkah ini = masa berlaku token pre-auth.
        berlakuSampai: klaim.exp ? new Date(klaim.exp * 1000).toISOString() : null,
      },
      { headers: TANPA_CACHE },
    );
  } catch (error) {
    console.error('[mfa-daftar] layanan gagal:', error);
    return NextResponse.json({ error: PESAN_LAYANAN }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  const dibatasi = await batasiPercobaan(req, ip, 'daftar');
  if (dibatasi) return dibatasi;
  if (!hasValidCsrfOrigin(req)) {
    return NextResponse.json({ error: 'Permintaan ditolak' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const kode = parsed.success ? parsed.data.kode.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(kode)) {
    return NextResponse.json({ error: PESAN_FORMAT }, { status: 400 });
  }

  try {
    const pre = await bacaPreAuth(req, 'daftar');
    if (!pre) return responsKembaliKePassword(PESAN_PREAUTH_BERAKHIR, 401);
    const { klaim, user } = pre;
    const id = String(user._id);
    const log = (aksi: string, ringkasan: string) =>
      writeAuditLog({ userId: user._id, email: user.email, aksi, entitas: 'AdminUser', entitasId: id, ringkasan, ...konteksLog(req, ip) });

    const tertunda = user.mfaRahasia || '';
    if (!tertunda) return NextResponse.json({ error: PESAN_MULAI_ULANG }, { status: 409 });
    let rahasia: string;
    try {
      rahasia = dekripsiRahasia(tertunda, konteksTertunda(klaim));
    } catch (error) {
      if (!(error instanceof SecretCryptoError)) throw error;
      // Rahasia dibuat oleh token lain atau kunci server berubah: pengguna memindai QR baru.
      return NextResponse.json({ error: PESAN_MULAI_ULANG }, { status: 409 });
    }

    const hasil = verifikasiTotp({ rahasia, kode });
    if (!hasil.ok) {
      // Pemohon sudah memegang rahasianya sendiri, jadi kode salah di sini bukan tebakan atas
      // akun: dicatat, tidak menambah penghitung captcha. Rate limit tetap berlaku.
      await log('mfa_gagal', 'Pendaftaran MFA: kode verifikasi salah');
      return NextResponse.json({ error: PESAN_SALAH }, { status: 400 });
    }

    // Aktivasi atomik, hanya bila rahasia tertunda belum diganti (GET lain) dan MFA belum aktif.
    const pemulihan = buatKodePemulihan();
    let rahasiaFinal: string;
    try {
      rahasiaFinal = enkripsiRahasia(rahasia, id);
    } catch (error) {
      return galatKunci(error);
    }
    const aktivasi = await AdminUser.updateOne(
      { _id: user._id, mfaAktif: { $ne: true }, mfaRahasia: tertunda },
      {
        $set: {
          mfaAktif: true,
          mfaRahasia: rahasiaFinal,
          mfaDiaktifkanPada: new Date(),
          mfaPeriodeTerakhir: hasil.periode,
          mfaKodePemulihan: pemulihan.hash,
        },
      },
    );
    if (aktivasi.modifiedCount !== 1) {
      return NextResponse.json({ error: PESAN_MULAI_ULANG }, { status: 409 });
    }

    await log('mfa_daftar', 'MFA diaktifkan; 10 kode pemulihan dibuat');
    const res = await terbitkanSesi(
      req,
      ip,
      { ...user, mfaAktif: true },
      'Login berhasil (pendaftaran MFA)',
      // Kode pemulihan polos hanya ada di respons ini; yang tersimpan hanya hash-nya (FR-08).
      { kodePemulihan: pemulihan.kode },
    );
    for (const [k, v] of Object.entries(TANPA_CACHE)) res.headers.set(k, v);
    return res;
  } catch (error) {
    console.error('[mfa-daftar] layanan gagal:', error);
    return NextResponse.json({ error: PESAN_LAYANAN }, { status: 503 });
  }
}
