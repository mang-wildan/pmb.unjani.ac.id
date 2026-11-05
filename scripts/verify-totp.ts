// Verifikasi modul TOTP terhadap vektor uji resmi (D1, FR-07). Jalankan: npx tsx scripts/verify-totp.ts
// Tanpa database, jaringan, maupun framework test. Keluar dengan kode 1 bila ada yang gagal.
import {
  base32Decode,
  base32Encode,
  buatRahasia,
  formatKunciManual,
  kodeHotp,
  kodeTotp,
  periodeDari,
  uriOtpauth,
  verifikasiTotp,
  type Algoritma,
} from '../src/lib/totp';

let lulus = 0;
let gagal = 0;
function cek(nama: string, kondisi: boolean, info?: unknown) {
  if (kondisi) {
    lulus++;
  } else {
    gagal++;
    console.log(`GAGAL: ${nama}${info === undefined ? '' : ` ${JSON.stringify(info)}`}`);
  }
}

// RFC 4648 §10: vektor base32 (padding dibuang karena keluaran modul tanpa padding).
const vektorBase32: [string, string][] = [
  ['', ''],
  ['f', 'MY'],
  ['fo', 'MZXQ'],
  ['foo', 'MZXW6'],
  ['foob', 'MZXW6YQ'],
  ['fooba', 'MZXW6YTB'],
  ['foobar', 'MZXW6YTBOI'],
];
for (const [asli, kode] of vektorBase32) {
  cek(`base32 encode "${asli}"`, base32Encode(Buffer.from(asli)) === kode, base32Encode(Buffer.from(asli)));
  cek(`base32 decode "${kode}"`, base32Decode(kode).toString() === asli);
}
cek('base32 decode huruf kecil, spasi, padding', base32Decode('mzxw 6ytb oi======').toString() === 'foobar');
let galat = false;
try {
  base32Decode('MZXW1');
} catch {
  galat = true;
}
cek('base32 menolak karakter di luar alfabet', galat);

// RFC 4226 Lampiran D: HOTP, rahasia "12345678901234567890".
const hotp = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
const kunci1 = Buffer.from('12345678901234567890');
hotp.forEach((kode, i) => cek(`HOTP counter ${i}`, kodeHotp(kunci1, BigInt(i)) === kode, kodeHotp(kunci1, BigInt(i))));

// RFC 6238 Lampiran B: TOTP 8 digit, T0 = 0, periode 30 detik.
const kunci: Record<Algoritma, Buffer> = {
  sha1: Buffer.from('12345678901234567890'),
  sha256: Buffer.from('12345678901234567890123456789012'),
  sha512: Buffer.from('1234567890123456789012345678901234567890123456789012345678901234'),
};
const vektorTotp: [number, string, string, string][] = [
  [59, '94287082', '46119246', '90693936'],
  [1111111109, '07081804', '68084774', '25091201'],
  [1111111111, '14050471', '67062674', '99943326'],
  [1234567890, '89005924', '91819424', '93441116'],
  [2000000000, '69279037', '90698825', '38618901'],
  [20000000000, '65353130', '77737706', '47863826'],
];
for (const [detik, s1, s256, s512] of vektorTotp) {
  const ms = detik * 1000;
  cek(`TOTP SHA1 t=${detik}`, kodeTotp(kunci.sha1, ms, 8, 'sha1') === s1, kodeTotp(kunci.sha1, ms, 8, 'sha1'));
  cek(`TOTP SHA256 t=${detik}`, kodeTotp(kunci.sha256, ms, 8, 'sha256') === s256);
  cek(`TOTP SHA512 t=${detik}`, kodeTotp(kunci.sha512, ms, 8, 'sha512') === s512);
}

// Verifikasi yang dipakai aplikasi: 6 digit SHA-1, toleransi ±1 periode, anti-replay.
const rahasia = base32Encode(kunci.sha1); // GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
cek('rahasia RFC dalam base32', rahasia === 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', rahasia);
const t = 1111111111 * 1000;
const kodeNow = kodeTotp(kunci.sha1, t);
cek('TOTP 6 digit = 6 digit terakhir vektor 8 digit', kodeNow === '050471', kodeNow);
const p = periodeDari(t);
const ok = verifikasiTotp({ rahasia, kode: kodeNow, waktuMs: t });
cek('kode periode ini diterima', ok.ok && ok.periode === p, ok);
cek('kode dengan spasi diterima', verifikasiTotp({ rahasia, kode: '050 471', waktuMs: t }).ok);
cek('jam HP mundur 30 detik (periode −1) diterima', verifikasiTotp({ rahasia, kode: kodeTotp(kunci.sha1, t - 30_000), waktuMs: t }).ok);
cek('jam HP maju 30 detik (periode +1) diterima', verifikasiTotp({ rahasia, kode: kodeTotp(kunci.sha1, t + 30_000), waktuMs: t }).ok);
const lewat = verifikasiTotp({ rahasia, kode: kodeTotp(kunci.sha1, t + 120_000), waktuMs: t });
cek('jam HP maju 2 menit ditolak', !lewat.ok && lewat.alasan === 'salah', lewat);
const lama = verifikasiTotp({ rahasia, kode: kodeTotp(kunci.sha1, t - 90_000), waktuMs: t });
cek('kode 90 detik lalu ditolak', !lama.ok && lama.alasan === 'salah', lama);
const replay = verifikasiTotp({ rahasia, kode: kodeNow, waktuMs: t, periodeTerakhir: p });
cek('kode yang sama dipakai ulang ditolak', !replay.ok && replay.alasan === 'dipakai_ulang', replay);
const mundur = verifikasiTotp({ rahasia, kode: kodeTotp(kunci.sha1, t - 30_000), waktuMs: t, periodeTerakhir: p });
cek('kode periode sebelum periode terakhir ditolak', !mundur.ok && mundur.alasan === 'dipakai_ulang', mundur);
cek('kode periode berikutnya setelah dipakai diterima', verifikasiTotp({ rahasia, kode: kodeTotp(kunci.sha1, t + 30_000), waktuMs: t, periodeTerakhir: p }).ok);
cek('periodeTerakhir null tidak memblokir', verifikasiTotp({ rahasia, kode: kodeNow, waktuMs: t, periodeTerakhir: null }).ok);
for (const salah of ['', '12345', '1234567', 'abcdef', '05047a', '０５０４７１']) {
  const h = verifikasiTotp({ rahasia, kode: salah, waktuMs: t });
  cek(`format ditolak: "${salah}"`, !h.ok && h.alasan === 'format', h);
}
const kodeLain = String((Number(kodeNow) + 1) % 1_000_000).padStart(6, '0');
cek('kode salah ditolak', !verifikasiTotp({ rahasia, kode: kodeLain, waktuMs: t }).ok);

// Rahasia baru & URI.
const baru = buatRahasia();
cek('rahasia baru 32 karakter base32 (160 bit)', /^[A-Z2-7]{32}$/.test(baru) && base32Decode(baru).length === 20, baru.length);
cek('rahasia baru unik', buatRahasia() !== baru);
cek('kunci manual dikelompokkan 4', formatKunciManual('ABCDEFGHIJKL') === 'ABCD EFGH IJKL');
const uri = new URL(uriOtpauth(rahasia, 'admin@unjani.ac.id'));
cek('URI skema & tipe', uri.protocol === 'otpauth:' && uri.host === 'totp', uri.href);
cek('URI label', decodeURIComponent(uri.pathname) === '/PMB UNJANI:admin@unjani.ac.id', uri.pathname);
cek(
  'URI parameter',
  uri.searchParams.get('secret') === rahasia &&
    uri.searchParams.get('issuer') === 'PMB UNJANI' &&
    uri.searchParams.get('algorithm') === 'SHA1' &&
    uri.searchParams.get('digits') === '6' &&
    uri.searchParams.get('period') === '30',
  [...uri.searchParams],
);
cek('URI tanpa tanda +', !uriOtpauth(rahasia, 'a@b.c').includes('+'));

console.log(`verify-totp: lulus ${lulus}, gagal ${gagal}`);
process.exit(gagal ? 1 : 0);
