import type { ProviderChatbot } from '@/models/Settings';

export type PanggilanTool = { id: string; nama: string; argumen: Record<string, unknown> };
export type PesanModel = {
  peran: 'system' | 'user' | 'assistant' | 'tool';
  isi: string;
  panggilanTool?: PanggilanTool[];
  id?: string;
  nama?: string;
};
export type HasilModel = { pesan: string; panggilanTool: PanggilanTool[] };

export class ProviderError extends Error {
  constructor() { super('Layanan chatbot tidak tersedia.'); this.name = 'ProviderError'; }
}

const BATAS_MS = 20_000;
const BATAS_BYTE = 256 * 1024;
const BATAS_BODY = 64 * 1024;
const BATAS_TOKEN = 900;
const NAMA_TOOL = /^[a-zA-Z0-9_-]{1,64}$/;
const MODEL = /^[a-zA-Z0-9._:/-]{1,160}$/;
const URL_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
const URL_DEEPSEEK = 'https://api.deepseek.com/chat/completions';
const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';

function isiTeks(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(p => (p && typeof p === 'object' && typeof (p as { text?: unknown }).text === 'string' ? (p as { text: string }).text : '')).join('');
  return '';
}
function argumen(v: unknown): Record<string, unknown> {
  let parsed: unknown;
  try { parsed = typeof v === 'string' ? JSON.parse(v) : v; } catch { throw new ProviderError(); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || JSON.stringify(parsed).length > 8000) throw new ProviderError();
  return parsed as Record<string, unknown>;
}
function panggilan(nama: unknown, args: unknown, id: unknown, urutan: number): PanggilanTool {
  if (typeof nama !== 'string' || !NAMA_TOOL.test(nama)) throw new ProviderError();
  return { id: typeof id === 'string' && id.length <= 200 ? id : `tool-${urutan}`, nama, argumen: argumen(args) };
}

/** Normalisasi respons Chat Completions (OpenRouter/DeepSeek) ke bentuk internal. */
export function normalisasiOpenAI(data: unknown): HasilModel {
  const pilihan = (data as { choices?: unknown })?.choices;
  if (!Array.isArray(pilihan) || !pilihan.length) throw new ProviderError();
  const pesan = (pilihan[0] as { message?: unknown })?.message;
  if (!pesan || typeof pesan !== 'object') throw new ProviderError();
  const isi = isiTeks((pesan as { content?: unknown }).content);
  const mentah = (pesan as { tool_calls?: unknown }).tool_calls;
  const daftar = mentah === undefined ? [] : Array.isArray(mentah) ? mentah.slice(0, 5) : null;
  if (!daftar) throw new ProviderError();
  const panggilanTool = daftar.map((t, i) => {
    const f = (t as { function?: unknown })?.function;
    if (!f || typeof f !== 'object') throw new ProviderError();
    return panggilan((f as { name?: unknown }).name, (f as { arguments?: unknown }).arguments, (t as { id?: unknown }).id, i);
  });
  if (isi.length > 8000 || (!isi.trim() && !panggilanTool.length)) throw new ProviderError();
  return { pesan: isi, panggilanTool };
}

/** Normalisasi respons generateContent (Gemini) ke bentuk internal. */
export function normalisasiGemini(data: unknown): HasilModel {
  const kandidat = (data as { candidates?: unknown })?.candidates;
  if (!Array.isArray(kandidat) || !kandidat.length) throw new ProviderError();
  const bagian = ((kandidat[0] as { content?: { parts?: unknown } })?.content?.parts);
  if (!Array.isArray(bagian)) throw new ProviderError();
  const teks: string[] = [];
  const panggilanTool: PanggilanTool[] = [];
  for (const [i, p] of bagian.slice(0, 10).entries()) {
    if (!p || typeof p !== 'object' || (p as { thought?: unknown }).thought === true) continue;
    const fc = (p as { functionCall?: unknown }).functionCall;
    if (fc && typeof fc === 'object') {
      if (panggilanTool.length >= 5) throw new ProviderError();
      panggilanTool.push(panggilan((fc as { name?: unknown }).name, (fc as { args?: unknown }).args ?? {}, (fc as { id?: unknown }).id, i));
    } else {
      const t = isiTeks((p as { text?: unknown }).text);
      if (t) teks.push(t);
    }
  }
  const pesan = teks.join('');
  if (pesan.length > 8000 || (!pesan.trim() && !panggilanTool.length)) throw new ProviderError();
  return { pesan, panggilanTool };
}

async function bacaTerbatas(res: Response, batas: number): Promise<string> {
  const tipe = res.headers.get('content-type') || '';
  if (!tipe.includes('json')) throw new ProviderError();
  const panjang = Number(res.headers.get('content-length') || 0);
  if (Number.isFinite(panjang) && panjang > batas) throw new ProviderError();
  const reader = res.body?.getReader();
  if (!reader) {
    const t = await res.text();
    if (Buffer.byteLength(t, 'utf8') > batas) throw new ProviderError();
    return t;
  }
  const potongan: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > batas) { await reader.cancel().catch(() => undefined); throw new ProviderError(); }
    potongan.push(value);
  }
  return Buffer.concat(potongan).toString('utf8');
}

function pesanOpenAI(messages: PesanModel[]) {
  return messages.map(m => {
    if (m.peran === 'tool') return { role: 'tool', tool_call_id: m.id || 'tool', content: m.isi };
    if (m.peran === 'assistant' && m.panggilanTool?.length) {
      return { role: 'assistant', content: m.isi, tool_calls: m.panggilanTool.map(t => ({ id: t.id, type: 'function', function: { name: t.nama, arguments: JSON.stringify(t.argumen) } })) };
    }
    return { role: m.peran, content: m.isi };
  });
}
function pesanGemini(messages: PesanModel[]) {
  const contents: Array<{ role: 'user' | 'model'; parts: unknown[] }> = [];
  for (const m of messages) {
    if (m.peran === 'system') continue;
    const role = m.peran === 'assistant' ? 'model' : 'user';
    const parts = m.peran === 'tool'
      ? [{ functionResponse: { name: m.nama || 'tool', response: { output: m.isi } } }]
      : m.panggilanTool?.length
        ? [...(m.isi ? [{ text: m.isi }] : []), ...m.panggilanTool.map(t => ({ functionCall: { name: t.nama, args: t.argumen } }))]
        : [{ text: m.isi }];
    const akhir = contents[contents.length - 1];
    if (akhir?.role === role) akhir.parts.push(...parts);
    else contents.push({ role, parts });
  }
  return contents;
}

export async function panggilModel(input: {
  provider: ProviderChatbot; model: string; apiKey: string; messages: PesanModel[]; tools: Array<{ name: string; description: string; parameters: unknown }>;
  opsi?: { fetch?: typeof fetch; timeoutMs?: number; maxByte?: number; maxBody?: number; maxToken?: number };
}): Promise<HasilModel> {
  const { provider, model, apiKey, messages, tools } = input;
  if (!apiKey || !MODEL.test(model)) throw new ProviderError();
  const fetchImpl = input.opsi?.fetch ?? fetch;
  const batasMs = input.opsi?.timeoutMs ?? BATAS_MS;
  const batasByte = input.opsi?.maxByte ?? BATAS_BYTE;
  const batasBody = input.opsi?.maxBody ?? BATAS_BODY;
  const maxToken = input.opsi?.maxToken ?? BATAS_TOKEN;
  let url: string; let headers: Record<string, string>; let body: unknown;
  if (provider === 'gemini') {
    url = `${URL_GEMINI}${encodeURIComponent(model)}:generateContent`;
    headers = { 'content-type': 'application/json', 'x-goog-api-key': apiKey };
    body = {
      systemInstruction: { parts: [{ text: messages.filter(m => m.peran === 'system').map(m => m.isi).join('\n') }] },
      contents: pesanGemini(messages),
      ...(tools.length ? { tools: [{ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }], toolConfig: { functionCallingConfig: { mode: 'AUTO' } } } : {}),
      generationConfig: { maxOutputTokens: maxToken, temperature: 0.2 },
    };
  } else {
    url = provider === 'openrouter' ? URL_OPENROUTER : URL_DEEPSEEK;
    headers = { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` };
    body = { model, messages: pesanOpenAI(messages), ...(tools.length ? { tools: tools.map(t => ({ type: 'function', function: t })), tool_choice: 'auto' } : {}), max_tokens: maxToken, temperature: 0.2 };
  }
  const teks = JSON.stringify(body);
  if (Buffer.byteLength(teks, 'utf8') > batasBody) throw new ProviderError();
  let res: Response;
  try { res = await fetchImpl(url, { method: 'POST', headers, body: teks, signal: AbortSignal.timeout(batasMs), cache: 'no-store' }); }
  catch { throw new ProviderError(); }
  if (!res.ok) throw new ProviderError();
  const mentah = await bacaTerbatas(res, batasByte);
  let data: unknown;
  try { data = JSON.parse(mentah); } catch { throw new ProviderError(); }
  return provider === 'gemini' ? normalisasiGemini(data) : normalisasiOpenAI(data);
}
