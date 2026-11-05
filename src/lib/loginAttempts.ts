import { PercobaanLoginGagal } from '@/models/PercobaanLoginGagal';

// Penghitung login gagal per email dan per IP untuk captcha bersyarat (FR-01, FR-02).
// Fungsi di sini melempar error bila database gagal; route login yang memutuskan perilakunya.

/** Jendela penghitungan: penghitung kedaluwarsa 15 menit setelah kegagalan terakhir. */
export const JENDELA_MS = 15 * 60 * 1000;

const AMBANG_DEFAULT = 3;

/** Ambang gagal sebelum captcha wajib. Dari env LOGIN_CAPTCHA_THRESHOLD (1–100), default 3. */
export function ambangCaptcha(): number {
  const raw = Number(process.env.LOGIN_CAPTCHA_THRESHOLD);
  return Number.isInteger(raw) && raw >= 1 && raw <= 100 ? raw : AMBANG_DEFAULT;
}

/** Normalisasi email: spasi di tepi dibuang, huruf kecil. `Admin@X.id ` dan `admin@x.id` dihitung sama. */
export function normalisasiEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type StatusCaptcha = {
  /** Captcha wajib bila email ATAU IP sudah mencapai ambang. */
  wajib: boolean;
  emailGagal: number;
  ipGagal: number;
  /** Waktu kegagalan terbaru (email atau IP) yang masih berlaku; null bila tidak ada. */
  gagalTerakhir: Date | null;
};

type Kunci = { jenis: 'email' | 'ip'; kunci: string };

function daftarKunci(email: string, ip: string): Kunci[] {
  return [
    { jenis: 'email', kunci: normalisasiEmail(email) },
    { jenis: 'ip', kunci: ip },
  ];
}

function hitungStatus(emailGagal: number, ipGagal: number, gagalTerakhir: Date | null): StatusCaptcha {
  const ambang = ambangCaptcha();
  return { wajib: emailGagal >= ambang || ipGagal >= ambang, emailGagal, ipGagal, gagalTerakhir };
}

/**
 * Status captcha untuk pasangan (email, IP). Dokumen yang sudah lewat kedaluwarsaPada tetapi belum
 * dihapus TTL (monitor TTL MongoDB berjalan ±60 detik sekali) tidak dihitung.
 */
export async function statusCaptcha(email: string, ip: string, now = new Date()): Promise<StatusCaptcha> {
  const docs = await PercobaanLoginGagal.find({
    $or: daftarKunci(email, ip),
    kedaluwarsaPada: { $gt: now },
  })
    .select('jenis jumlah gagalTerakhir')
    .lean();
  const ambil = (jenis: 'email' | 'ip') => docs.find((d) => d.jenis === jenis)?.jumlah ?? 0;
  const waktu = docs.map((d) => d.gagalTerakhir?.getTime() ?? 0).filter((t) => t > 0);
  return hitungStatus(ambil('email'), ambil('ip'), waktu.length ? new Date(Math.max(...waktu)) : null);
}

function isDuplikat(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

async function catatSatu({ jenis, kunci }: Kunci, now: Date): Promise<number> {
  const kedaluwarsaPada = new Date(now.getTime() + JENDELA_MS);
  // Update pipeline atomik: tambah 1 bila penghitung masih berlaku, mulai lagi dari 1 bila sudah
  // kedaluwarsa (atau dokumen baru). Satu operasi, aman terhadap request bersamaan.
  const pipeline = [
    {
      $set: {
        jenis,
        kunci,
        jumlah: {
          $cond: [{ $gt: ['$kedaluwarsaPada', now] }, { $add: [{ $ifNull: ['$jumlah', 0] }, 1] }, 1],
        },
        gagalTerakhir: now,
        kedaluwarsaPada,
        createdAt: { $ifNull: ['$createdAt', now] },
        updatedAt: now,
      },
    },
  ];
  const jalankan = () =>
    PercobaanLoginGagal.findOneAndUpdate({ jenis, kunci }, pipeline, {
      upsert: true,
      new: true,
      timestamps: false,
    })
      .select('jumlah')
      .lean();
  let doc;
  try {
    doc = await jalankan();
  } catch (error) {
    // Dua upsert bersamaan untuk kunci baru: satu kalah oleh index unik. Ulangi sekali sebagai update.
    if (!isDuplikat(error)) throw error;
    doc = await jalankan();
  }
  return doc?.jumlah ?? 1;
}

/** Catat satu login gagal untuk email dan IP sekaligus; kembalikan status terbaru. */
export async function catatGagal(email: string, ip: string, now = new Date()): Promise<StatusCaptcha> {
  const [emailGagal, ipGagal] = await Promise.all(daftarKunci(email, ip).map((k) => catatSatu(k, now)));
  return hitungStatus(emailGagal, ipGagal, now);
}

/** Login sukses: reset penghitung email. Penghitung IP sengaja tidak direset (FR-02). */
export async function resetEmail(email: string): Promise<void> {
  await PercobaanLoginGagal.deleteOne({ jenis: 'email', kunci: normalisasiEmail(email) });
}
