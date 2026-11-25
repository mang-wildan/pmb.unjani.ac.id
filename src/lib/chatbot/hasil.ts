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

// ponytail: parafrasa bebas diizinkan, tetapi setiap token angka wajib ada di bukti terpilih.
// Batas ini menahan nominal/tanggal karangan tanpa memaksa model menyalin kalimat verbatim.
const BIAYA_TANGGAL = /%|\b(biaya|tarif|harga|rupiah|rp|idr|diskon|potongan|beasiswa|gratis|jadwal|dibuka|ditutup|deadline|tanggal|semester|gelombang|juta|ribu|miliar|januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i;
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
function konflikSumberSensitif(klaim: string, buktiDipakai: Bukti[]): boolean {
  const acuan = klaimBerlabel(klaim);
  if (!acuan?.label) return false;
  const penting = (label: string) => label.split(' ').filter(t => t.length > 2 && !['biaya', 'rupiah', 'idr', 'adalah', 'sebesar', 'untuk', 'yang', 'dan', 'dengan', 'pada', 'dari', 'ini', 'itu'].includes(t));
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
    const khusus = aman(data.klarifikasi, 400);
    // Klarifikasi bukan klaim fakta: tolak bila menyelipkan angka/nominal/tanggal karangan.
    const bersih = khusus && !/[\d]/.test(khusus) && !BIAYA_TANGGAL.test(khusus) && !TERLARANG.test(khusus) ? khusus : '';
    return { jawaban: bersih || PESAN.clarification_needed, sumber: [], status, tawarkanWhatsApp: false };
  }
  if (status !== 'answered') return hasilStatus('no_source');
  const ids = Array.isArray(data.buktiIds) ? data.buktiIds.filter((x): x is string => typeof x === 'string').slice(0, 5) : [];
  const dipilih: Bukti[] = [];
  for (const id of ids) {
    const b = peta.get(id);
    if (b && !dipilih.some(x => x.id === b.id)) dipilih.push(b);
  }
  if (!dipilih.length) return hasilStatus('no_source');
  const jawaban = aman(data.jawaban, 1200);
  if (jawaban.length < 2) return hasilStatus('no_source');

  if (TERLARANG.test(jawaban)) return hasilStatus('no_source');
  const pilihan = kalimat(jawaban);
  if (!pilihan.length || pilihan.length > 3) return hasilStatus('no_source');
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

const SAPAAN = /^(?:assalamualaikum|salam|hai+|halo+|hallo+|hi+|hey+|pagi|siang|sore|malam|permisi|min|kak|admin|tes|test|p|oke?|siap|terima\s?kasih|makasih|thanks?|thank\s?you)\b/i;
export const JAWABAN_SAPAAN = 'Halo! Saya asisten PMB UNJANI. Silakan tanya soal program studi, jalur seleksi, jadwal, biaya, atau cara mendaftar.';
/**
 * Sapaan murni tanpa isi pertanyaan. Dipakai hanya untuk mengganti `no_source`
 * pada pesan singkat, sehingga sapaan tidak pernah dijawab dengan penolakan.
 */
export function adalahSapaan(pesan: string): boolean {
  const bersih = pesan.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return bersih.length <= 25 && SAPAAN.test(bersih) && !/\d/.test(bersih) && !BIAYA_TANGGAL.test(bersih);
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
