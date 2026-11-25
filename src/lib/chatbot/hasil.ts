import type { Bukti } from './tools';

export type StatusChat = 'answered' | 'clarification_needed' | 'no_source' | 'out_of_scope' | 'temporarily_unavailable';
export type SumberChat = { judul: string; url: string };
export type HasilChat = { jawaban: string; sumber: SumberChat[]; status: StatusChat; tawarkanWhatsApp: boolean };

const PESAN: Record<Exclude<StatusChat, 'answered'>, string> = {
  clarification_needed: 'Mohon lengkapi program studi, tahun/periode, jalur, dan kelas yang dimaksud agar saya dapat memilih data resmi yang tepat.',
  no_source: 'Saya belum menemukan sumber resmi aktif yang cukup untuk menjawab pertanyaan itu. Silakan hubungi Admin PMB.',
  out_of_scope: 'Pertanyaan itu di luar cakupan informasi admisi yang dapat saya jawab. Silakan hubungi Admin PMB.',
  temporarily_unavailable: 'Layanan chatbot sedang tidak tersedia. Silakan coba lagi atau hubungi Admin PMB.',
};

const BULAN = 'januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember';
const KATA_NILAI = 'dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu|juta|miliar|triliun';
// ponytail: pada jawaban berbukti, kalimat sensitif = memuat nilai uang/tanggal yang menyertai labelnya.
// Menyebut topik ("seputar biaya dan jadwal") tanpa nilai bukan klaim fakta.
const BIAYA_TANGGAL = new RegExp(
  `%|\\b(?:gratis|beasiswa)\\b|\\b(?:rp|idr)\\.?\\s*\\d|\\b(?:${KATA_NILAI})\\s+(?:juta|ribu|miliar|rupiah)\\b`
  + `|(?:\\b(?:biaya|tarif|harga|rupiah|rp|idr|semester|juta|ribu|miliar|gelombang)\\b[^.]{0,20}\\d|\\d[^.]{0,20}\\b(?:biaya|tarif|harga|rupiah|rp|idr|semester|juta|ribu|miliar|gelombang)\\b)`
  + `|\\b(?:dibuka|ditutup|deadline|tanggal)\\b|\\b(?:${BULAN})\\b`
  + `|\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\b`,
  'i',
);
/**
 * Teks tanpa bukti tidak boleh memuat nilai apa pun: angka, kata bilangan, nama bulan,
 * atau klaim bebas biaya. Sebutan jenjang seperti S1/D3 bukan nilai.
 */
const NILAI_TANPA_BUKTI = new RegExp(`(?<![SD])\\d|\\b(?:${KATA_NILAI})\\b|\\b(?:${BULAN})\\b|\\b(?:gratis|beasiswa|diskon|potongan)\\b`, 'i');
/** Fakultas yang boleh disebut dari pengetahuan statis tanpa bukti. */
const FAKULTAS_DIKENAL = ['kedokteran gigi', 'kedokteran', 'farmasi', 'teknik', 'sains dan informatika', 'sains & informatika', 'ekonomi dan bisnis', 'ekonomi & bisnis', 'ilmu sosial dan ilmu politik', 'ilmu sosial & ilmu politik', 'psikologi', 'ilmu dan teknologi kesehatan', 'ilmu & teknologi kesehatan', 'pascasarjana'];
/** Jawaban tanpa bukti tidak boleh mengarang fakultas atau mengklaim akreditasi. */
function klaimTanpaBuktiTerlarang(teks: string): boolean {
  if (/\b(?:akreditasi|terakreditasi)\b/i.test(teks)) return true;
  return [...teks.matchAll(/\bfakultas\s+([\p{L}&]+(?:\s+[\p{L}&]+){0,2})/giu)]
    .some(m => { const nama = m[1].toLowerCase(); return !FAKULTAS_DIKENAL.some(d => nama.startsWith(d) || d.startsWith(nama)); });
}
/** Token angka tanpa pemisah ribuan/desimal agar "Rp5.500.000" dibandingkan sebagai 5500000. */
const angka = (teks: string): string[] => (teks.match(/\d[\d.,]*/g) ?? []).map(n => n.replace(/[.,]/g, '')).filter(Boolean);
const TERLARANG = /total\s+(?:biaya|pengeluaran)|(?:sampai|hingga)\s+lulus|(?:selama|sepanjang)\s+kuliah|masa\s+studi/i;
const jenis = (id: string) => id.split(':')[0];
// Bandingkan hanya label klaim identik, bukan seluruh angka dalam sumber lain.
function klaimBerlabel(teks: string): { label: string; nilai: string } | null {
  const m = teks.toLowerCase().match(/^(.*?)(?:rp\.?\s*|idr\s*)(\d[\d.,]*)/);
  if (m) return { label: m[1].replace(/[^\p{L}\p{N}]+/gu, ' ').trim(), nilai: String(Number(m[2].replace(/\./g, '').replace(',', '.'))) };
  const d = teks.toLowerCase().match(/^(.*?)(\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}|\d{4}-\d{2}-\d{2})/);
  if (d) return { label: d[1].replace(/[^\p{L}\p{N}]+/gu, ' ').trim(), nilai: d[2] };
  return null;
}
const KATA_UMUM = ['biaya', 'rupiah', 'idr', 'adalah', 'sebesar', 'untuk', 'yang', 'dan', 'dengan', 'pada', 'dari', 'ini', 'itu'];
const penting = (label: string) => label.split(' ').filter(t => t.length > 2 && !KATA_UMUM.includes(t));
/** Klaim berlabel yang labelnya ada di tabel tetapi nilainya milik label lain. */
function labelTertukar(klaim: string, tabel: Bukti[]): boolean {
  const acuan = klaimBerlabel(klaim);
  if (!acuan) return false;
  const tokenAcuan = penting(acuan.label);
  if (!tokenAcuan.length) return false;
  const serupa = tabel.flatMap(b => kalimat(aman(b.ringkas, 1800))).map(klaimBerlabel)
    .filter((k): k is { label: string; nilai: string } => !!k && penting(k.label).some(t => tokenAcuan.includes(t)));
  return serupa.length > 0 && !serupa.some(k => k.nilai === acuan.nilai);
}
function konflikSumberSensitif(klaim: string, buktiDipakai: Bukti[]): boolean {
  const acuan = klaimBerlabel(klaim);
  if (!acuan?.label) return false;
  const tokenAcuan = penting(acuan.label);
  return buktiDipakai.filter(b => ['faq', 'pengumuman'].includes(jenis(b.id)))
    .flatMap(b => kalimat(aman(b.ringkas, 1800)))
    .some(s => {
      const lain = klaimBerlabel(s);
      if (!lain || lain.nilai === acuan.nilai) return false;
      const tokenLain = penting(lain.label);
      return acuan.label === lain.label || (tokenAcuan.length > 0 && tokenAcuan.some(t => tokenLain.includes(t)));
    });
}
const kalimat = (teks: string): string[] => teks.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

/** Buang HTML, Markdown tautan, dan URL dari teks yang berasal dari model. */
function aman(v: unknown, max: number): string {
  return String(v ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[*_`#>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
function objekJson(teks: string): Record<string, unknown> {
  const bersih = teks.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const awal = bersih.indexOf('{');
  const akhir = bersih.lastIndexOf('}');
  if (awal < 0 || akhir <= awal) throw new Error();
  const parsed: unknown = JSON.parse(bersih.slice(awal, akhir + 1));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
  return parsed as Record<string, unknown>;
}
/** Jawaban berupa pilihan kalimat utuh, bukan validasi semantik prosa bebas. */
export function susunHasilChat(teksModel: string, buktiDipakai: Bukti[]): HasilChat {
  const peta = new Map(buktiDipakai.map(b => [b.id, b]));
  let data: Record<string, unknown>;
  try { data = objekJson(teksModel); } catch { return hasilStatus('no_source'); }
  const status = data.status;
  if (status === 'no_source' || status === 'out_of_scope') return hasilStatus(status);
  if (status === 'clarification_needed') {
    // Pertanyaan balik buatan model lebih luwes daripada template; `klarifikasi` dipertahankan untuk keluaran lama.
    const khusus = aman(data.jawaban ?? data.klarifikasi, 400);
    // Klarifikasi bukan klaim fakta: tolak bila menyelipkan nilai (angka, kata bilangan, bulan) atau tanggal.
    const bersih = khusus && !NILAI_TANPA_BUKTI.test(khusus) && !BIAYA_TANGGAL.test(khusus) && !TERLARANG.test(khusus) ? khusus : '';
    return { jawaban: bersih || PESAN.clarification_needed, sumber: [], status, tawarkanWhatsApp: false };
  }
  if (status !== 'answered') return hasilStatus('no_source');
  const ids = Array.isArray(data.buktiIds) ? data.buktiIds.filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
  const dipilih: Bukti[] = [];
  for (const id of ids) {
    const b = peta.get(id);
    if (b && !dipilih.some(x => x.id === b.id)) dipilih.push(b);
  }
  if (ids.length && !dipilih.length) return hasilStatus('no_source');
  const jawaban = aman(data.jawaban, 1200);
  if (jawaban.length < 2) return hasilStatus('no_source');

  if (TERLARANG.test(jawaban)) return hasilStatus('no_source');
  const pilihan = kalimat(jawaban);
  if (!pilihan.length || pilihan.length > 3) return hasilStatus('no_source');
  if (!dipilih.length) {
    // ponytail: jawaban tanpa bukti hanya untuk percakapan dan profil statis kampus.
    // Semua nilai, tanggal, akreditasi, dan fakultas di luar daftar statis wajib lewat tool.
    if (NILAI_TANPA_BUKTI.test(jawaban) || BIAYA_TANGGAL.test(jawaban) || klaimTanpaBuktiTerlarang(jawaban)) return hasilStatus('no_source');
    return { jawaban, sumber: [], status: 'answered', tawarkanWhatsApp: false };
  }
  // Setiap angka pada jawaban harus berasal dari bukti terpilih; sisanya boleh parafrasa.
  const angkaBukti = new Set(dipilih.flatMap(b => angka(aman(b.ringkas, 1800))));
  if (!angka(jawaban).every(n => angkaBukti.has(n))) return hasilStatus('no_source');
  // Angka pada kalimat biaya/jadwal wajib berasal dari baris biaya/jadwal, bukan FAQ/pengumuman.
  const angkaTerstruktur = new Set(dipilih.filter(b => ['biaya', 'jadwal'].includes(jenis(b.id))).flatMap(b => angka(aman(b.ringkas, 1800))));
  for (const klaim of pilihan) {
    const sensitif = BIAYA_TANGGAL.test(klaim);
    if (!sensitif) continue;
    // Nominal/tanggal resmi hanya boleh diklaim bila bukti biaya/jadwal ikut dipilih.
    if (!dipilih.some(b => ['biaya', 'jadwal'].includes(jenis(b.id)))) return hasilStatus('no_source');
    if (!angka(klaim).every(n => angkaTerstruktur.has(n))) return hasilStatus('no_source');
    // Nominal berbentuk kata (mis. "lima juta rupiah") wajib didukung angka pada tabel biaya/jadwal terpilih.
    if (new RegExp(`\\b(?:${KATA_NILAI})\\b`, 'i').test(klaim) && !angkaTerstruktur.size) return hasilStatus('no_source');
    // Nominal harus berpasangan dengan labelnya di tabel: "SPT per unit" tidak boleh memakai nilai "Biaya pokok".
    if (labelTertukar(klaim, dipilih.filter(b => ['biaya', 'jadwal'].includes(jenis(b.id))))) return hasilStatus('no_source');
    // Konflik nominal terbukti antara tabel vs FAQ/Pengumuman: tolak klaim biaya.
    if (konflikSumberSensitif(klaim, buktiDipakai)) return hasilStatus('no_source');
  }

  const sumber: SumberChat[] = [];
  for (const b of dipilih) if (!sumber.some(s => s.url === b.url)) sumber.push({ judul: b.judul, url: b.url });
  return { jawaban, sumber: sumber.slice(0, 5), status: 'answered', tawarkanWhatsApp: false };
}

export function hasilStatus(status: Exclude<StatusChat, 'answered'>): HasilChat {
  return { jawaban: PESAN[status], sumber: [], status, tawarkanWhatsApp: status !== 'clarification_needed' };
}

const KATA_SAPAAN = /^(?:assalamualaikum|salam|selamat|hai|halo|hallo|hi|hey|pagi|siang|sore|malam|permisi|min|kak|admin|tes|test|p|oke|ok|siap|terima|kasih|makasih|thanks|thank|you|semua|semuanya|bapak|ibu|pak|bu|bang|mas|mbak|ya|nih|dong|deh|aja|saja)$/;
export const JAWABAN_SAPAAN = 'Halo! Saya asisten PMB UNJANI. Silakan tanya soal program studi, jalur seleksi, jadwal, biaya, atau cara mendaftar.';
/**
 * Sapaan murni: seluruh kata pesan adalah kata sapaan. Pesan yang menyelipkan
 * pertanyaan ("halo, berapa biaya TI?") bukan sapaan dan tetap diproses normal.
 */
export function adalahSapaan(pesan: string): boolean {
  const kata = pesan.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return kata.length > 0 && kata.length <= 5 && kata.every(k => KATA_SAPAAN.test(k));
}

/** Batasi riwayat klien: hanya user/assistant, maks 12 pesan dan 4.000 karakter total. */
export function batasiRiwayat(riwayat: Array<{ peran: 'user' | 'assistant'; isi: string }>): Array<{ peran: 'user' | 'assistant'; isi: string }> {
  const hasil: Array<{ peran: 'user' | 'assistant'; isi: string }> = [];
  let total = 0;
  for (let i = riwayat.length - 1; i >= 0 && hasil.length < 12; i--) {
    const m = riwayat[i];
    if (!m || (m.peran !== 'user' && m.peran !== 'assistant')) continue;
    const isi = String(m.isi ?? '').trim().slice(0, 500);
    if (!isi) continue;
    if (total + isi.length > 4000) break;
    total += isi.length;
    hasil.unshift({ peran: m.peran, isi });
  }
  return hasil;
}
