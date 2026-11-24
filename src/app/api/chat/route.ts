import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { clientIpFromHeaders } from '@/lib/http';
import { rateLimit } from '@/lib/rateLimit';
import { dekripsiChatbotSecret } from '@/lib/chatbotSecret';
import { KEY_API_PROVIDER, PROVIDER_CHATBOT, Settings, modelUntukProvider, type ProviderChatbot } from '@/models/Settings';
import { PROMPT_CHATBOT } from '@/lib/chatbot/prompt';
import { TOOLS, KonflikError, KlarifikasiError, jalankanTool, type Bukti } from '@/lib/chatbot/tools';
import { panggilModel, type PesanModel } from '@/lib/chatbot/providers';
import { batasiRiwayat, hasilStatus, susunHasilChat, type HasilChat } from '@/lib/chatbot/hasil';

export const runtime = 'nodejs';

const BATAS_BODY = 32 * 1024;
const BATAS_BUKTI_MODEL = 8 * 1024;
const riwayatSchema = z.object({ peran: z.enum(['user', 'assistant']), isi: z.string().trim().min(1).max(500) }).strict();

async function bacaBodyTerbatas(req: Request, batas: number): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return '';
  const potongan: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > batas) {
        await reader.cancel().catch(() => undefined);
        throw new Error('BODY_BESAR');
      }
      potongan.push(value);
    }
  } catch (error) {
    if ((error as { message?: string })?.message === 'BODY_BESAR') throw error;
    throw new Error('BODY_RUSAK');
  }
  return Buffer.concat(potongan).toString('utf8');
}
const bodySchema = z.object({ pesan: z.string().trim().min(1).max(500), riwayat: z.array(riwayatSchema).max(20).optional() }).strict();

function balas(hasil: HasilChat, status = 200) {
  return NextResponse.json(hasil, { status, headers: { 'Cache-Control': 'no-store' } });
}
function asalSah(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Klien non-browser; tidak ada cookie yang dilindungi.
  try {
    const asal = new URL(origin);
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim();
    const proto = (req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':', '')).split(',')[0].trim();
    return Boolean(host) && asal.host === host && asal.protocol === `${proto}:`;
  } catch { return false; }
}

export async function POST(req: Request) {
  const ip = clientIpFromHeaders(req.headers);
  if (!rateLimit(`chat:${ip}`, 15, 60_000).allowed) return balas(hasilStatus('temporarily_unavailable'), 429);
  if (!asalSah(req)) return balas({ ...hasilStatus('out_of_scope'), jawaban: 'Permintaan ditolak.' }, 403);
  if (!(req.headers.get('content-type') || '').toLowerCase().includes('application/json')) return balas(hasilStatus('out_of_scope'), 415);
  const headerPanjang = req.headers.get('content-length');
  if (headerPanjang !== null && !/^\d+$/.test(headerPanjang)) return balas(hasilStatus('out_of_scope'), 400);
  const panjang = Number(headerPanjang || 0);
  if (panjang > BATAS_BODY) return balas(hasilStatus('out_of_scope'), 413);
  let mentah: string;
  try { mentah = await bacaBodyTerbatas(req, BATAS_BODY); }
  catch (error) {
    if ((error as { message?: string })?.message === 'BODY_BESAR') return balas(hasilStatus('out_of_scope'), 413);
    return balas(hasilStatus('out_of_scope'), 400);
  }
  if (headerPanjang !== null && Buffer.byteLength(mentah, 'utf8') !== panjang) return balas(hasilStatus('out_of_scope'), 400);
  if (!mentah) return balas(hasilStatus('out_of_scope'), 400);
  let data: unknown;
  try { data = JSON.parse(mentah); } catch { return balas(hasilStatus('out_of_scope'), 400); }
  const parsed = bodySchema.safeParse(data);
  if (!parsed.success) return balas(hasilStatus('out_of_scope'), 400);

  let settings;
  // Loader singleton lama membuat dokumen bila belum ada; endpoint publik wajib baca-saja.
  try { await connectDb(); settings = await Settings.findOne({ singleton: 'main' }).select('chatbot').maxTimeMS(5000).lean(); } catch { return balas(hasilStatus('temporarily_unavailable'), 503); }
  const chatbot = settings?.chatbot;
  const provider = chatbot?.provider as ProviderChatbot | undefined;
  if (!chatbot?.aktif || !provider || !PROVIDER_CHATBOT.includes(provider)) return balas(hasilStatus('temporarily_unavailable'), 503);
  const ciphertext = chatbot[KEY_API_PROVIDER[provider]];
  const model = modelUntukProvider(chatbot, provider);
  if (!ciphertext || !model) return balas(hasilStatus('temporarily_unavailable'), 503);
  let apiKey: string;
  try { apiKey = dekripsiChatbotSecret(ciphertext); } catch { return balas(hasilStatus('temporarily_unavailable'), 503); }

  const riwayat = batasiRiwayat(parsed.data.riwayat ?? []);
  const messages: PesanModel[] = [
    { peran: 'system', isi: PROMPT_CHATBOT },
    ...riwayat.map(m => ({ peran: m.peran, isi: m.isi }) as PesanModel),
    { peran: 'user', isi: parsed.data.pesan },
  ];
  const bukti = new Map<string, Bukti>();
  let hasil = null;
  let totalBukti = 0;
  const terlaluLuas = () => balas({ ...hasilStatus('clarification_needed'), jawaban: 'Pertanyaan terlalu luas untuk diproses aman. Mohon sebutkan program studi, tahun/periode, jalur, dan kelas yang dimaksud.' });
  try {
    for (let ronde = 0; ronde < 3; ronde++) {
      const keluaran = await panggilModel({ provider, model, apiKey, messages, tools: TOOLS });
      if (!keluaran.panggilanTool.length) { hasil = keluaran; break; }
      messages.push({ peran: 'assistant', isi: keluaran.pesan, panggilanTool: keluaran.panggilanTool });
      for (const panggilan of keluaran.panggilanTool) {
        let isi: string;
        try {
          const rows = await jalankanTool(panggilan.nama, panggilan.argumen);
          for (const b of rows) if (bukti.size < 24) bukti.set(b.id, b);
          // Jangan pilih sebagian baris diam-diam; hasil luas = klarifikasi.
          if (rows.length > 4) return terlaluLuas();
          isi = JSON.stringify(rows.map(({ id, judul, ringkas }) => ({ id, judul, ringkas })));
        } catch (error) {
          if (error instanceof KonflikError) {
            return balas({ jawaban: 'Sumber biaya resmi untuk pilihan itu saling bertentangan. Bagian yang berbeda tidak saya jawab; silakan hubungi Admin PMB.', sumber: [], status: 'no_source', tawarkanWhatsApp: true });
          }
          if (error instanceof KlarifikasiError) {
            return balas({ ...hasilStatus('clarification_needed'), jawaban: 'Saya menemukan lebih dari satu data yang mungkin cocok. Mohon sebutkan program studi, tahun/periode, jalur, dan kelas.' });
          }
          isi = JSON.stringify([{ id: 'error', judul: 'argumen_tidak_valid', ringkas: 'Tool tidak dijalankan. Perbaiki argumen atau minta klarifikasi.' }]);
        }
        totalBukti += Buffer.byteLength(isi, 'utf8');
        // Batas anggaran bukti sebelum fetch: hentikan putaran, jangan kirim body kebesaran.
        if (totalBukti > BATAS_BUKTI_MODEL) return terlaluLuas();
        messages.push({ peran: 'tool', id: panggilan.id, nama: panggilan.nama, isi });
      }
    }
    if (!hasil) hasil = await panggilModel({ provider, model, apiKey, messages, tools: [] });
  } catch {
    // Jangan catat penyebab upstream/prompt/history; tutup aman tanpa detail.
    return balas(hasilStatus('temporarily_unavailable'), 503);
  }
  return balas(susunHasilChat(hasil.pesan, [...bukti.values()]));
}
