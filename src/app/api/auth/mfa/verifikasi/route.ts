import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { AdminUser } from '@/models/AdminUser';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';
import { hasValidCsrfOrigin } from '@/lib/csrf';
import { catatGagal } from '@/lib/loginAttempts';
import { verifikasiTotp } from '@/lib/totp';
import { SecretCryptoError, dekripsiRahasia } from '@/lib/secretCrypto';
import { normalisasiKode, pakaiKodePemulihan } from '@/lib/recoveryCodes';
import {
  PESAN_LAYANAN,
  PESAN_PREAUTH_BERAKHIR,
  bacaPreAuth,
  batasiPercobaan,
  infoCaptcha,
  konteksLog,
  preAuthHangus,
  responsKembaliKePassword,
  terbitkanSesi,
} from '@/lib/alurLogin';

export const runtime = 'nodejs';

// Login admin langkah 2 (FR-07, FR-08): kode TOTP 6 digit atau kode pemulihan, dengan token
// pre-auth tahap 'verifikasi' dari langkah password. Kode salah dihitung sebagai login gagal
// (FR-02); bila ambang tercapai, pengguna dikembalikan ke langkah password (captcha berlaku di sana).

const schema = z.object({ kode: z.string().min(1).max(32) });

const PESAN_FORMAT = 'Masukkan 6 digit kode dari aplikasi authenticator, atau kode pemulihan (xxxxx-xxxxx).';
const PESAN_SALAH = 'Kode salah atau sudah dipakai. Tunggu kode berikutnya di aplikasi authenticator lalu coba lagi.';
const PESAN_TERLALU_BANYAK = 'Terlalu banyak kode salah. Masuk ulang dengan email dan password.';
const PESAN_RAHASIA =
  'Verifikasi kode authenticator tidak dapat dilakukan saat ini. Gunakan kode pemulihan atau hubungi administrator.';

type Jenis = 'totp' | 'pemulihan';

function jenisKode(kode: string): Jenis | null {
  if (/^\d{6}$/.test(kode.replace(/\s/g, ''))) return 'totp';
  return normalisasiKode(kode) ? 'pemulihan' : null;
}

export async function POST(req: NextRequest) {
  const ip = clientIpFromHeaders(req.headers);
  const dibatasi = await batasiPercobaan(req, ip, 'mfa');
  if (dibatasi) return dibatasi;
  if (!hasValidCsrfOrigin(req)) {
    return NextResponse.json({ error: 'Permintaan ditolak' }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const jenis = parsed.success ? jenisKode(parsed.data.kode) : null;
  // Format salah (salah ketik panjang/karakter) tidak menebak apa pun: 400, tidak dihitung.
  if (!parsed.success || !jenis) {
    return NextResponse.json({ error: PESAN_FORMAT }, { status: 400 });
  }
  const kode = parsed.data.kode;

  try {
    const pre = await bacaPreAuth(req, 'verifikasi');
    if (!pre) return responsKembaliKePassword(PESAN_PREAUTH_BERAKHIR, 401);
    const { klaim, user } = pre;
    const rc = await infoCaptcha();

    // Token yang sudah "hangus" oleh kegagalan setelah ia terbit tidak boleh dipakai menebak lagi.
    const hangus = await preAuthHangus(user.email, ip, klaim);
    if (hangus) {
      return responsKembaliKePassword(PESAN_TERLALU_BANYAK, 401, { wajib: rc.aktif, siteKey: rc.siteKey });
    }

    const log = (aksi: string, ringkasan: string) =>
      writeAuditLog({
        userId: user._id,
        email: user.email,
        aksi,
        entitas: 'AdminUser',
        entitasId: String(user._id),
        ringkasan,
        ...konteksLog(req, ip),
      });

    let alasanGagal: string | null = null;

    if (jenis === 'totp') {
      let rahasia: string;
      try {
        if (!user.mfaRahasia) throw new SecretCryptoError('Rahasia MFA akun kosong padahal MFA aktif.');
        rahasia = dekripsiRahasia(user.mfaRahasia, String(user._id));
      } catch (error) {
        if (!(error instanceof SecretCryptoError)) throw error;
        // Masalah konfigurasi server/data, bukan kesalahan pengguna: tidak dihitung, gagal tertutup.
        console.error('[mfa] rahasia tidak dapat dipakai:', error.message);
        await log('mfa_gagal', 'Verifikasi MFA gagal: rahasia TOTP tidak dapat didekripsi (cek MFA_ENCRYPTION_KEY)');
        return NextResponse.json({ error: PESAN_RAHASIA }, { status: 503 });
      }
      const hasil = verifikasiTotp({ rahasia, kode, periodeTerakhir: user.mfaPeriodeTerakhir });
      if (hasil.ok) {
        // Simpan periode secara atomik: dua permintaan bersamaan dengan kode yang sama hanya lolos satu.
        const simpan = await AdminUser.updateOne(
          {
            _id: user._id,
            $or: [{ mfaPeriodeTerakhir: null }, { mfaPeriodeTerakhir: { $lt: hasil.periode } }],
          },
          { $set: { mfaPeriodeTerakhir: hasil.periode } },
        );
        if (simpan.modifiedCount === 1) {
          return terbitkanSesi(req, ip, user, 'Login berhasil (kode authenticator)');
        }
        alasanGagal = 'kode authenticator sudah dipakai';
      } else {
        alasanGagal = hasil.alasan === 'dipakai_ulang' ? 'kode authenticator sudah dipakai' : 'kode authenticator salah';
      }
    } else {
      if (await pakaiKodePemulihan(String(user._id), kode)) {
        const sisa =
          (await AdminUser.findById(user._id).select('+mfaKodePemulihan').lean())?.mfaKodePemulihan?.length ?? 0;
        await log('mfa_kode_pemulihan_dipakai', `Kode pemulihan dipakai untuk login (sisa ${sisa})`);
        return terbitkanSesi(req, ip, user, 'Login berhasil (kode pemulihan)', { sisaKodePemulihan: sisa });
      }
      alasanGagal = 'kode pemulihan salah atau sudah dipakai';
    }

    // Kode salah: hitung sebagai login gagal (FR-02), jangan pernah catat kodenya.
    const status = await catatGagal(user.email, ip);
    await log('mfa_gagal', `Verifikasi MFA gagal: ${alasanGagal}`);
    if (status.wajib) {
      return responsKembaliKePassword(PESAN_TERLALU_BANYAK, 401, { wajib: rc.aktif, siteKey: rc.siteKey });
    }
    return NextResponse.json({ error: PESAN_SALAH, kembaliKePassword: false }, { status: 401 });
  } catch (error) {
    console.error('[mfa] layanan gagal:', error);
    return NextResponse.json({ error: PESAN_LAYANAN }, { status: 503 });
  }
}
