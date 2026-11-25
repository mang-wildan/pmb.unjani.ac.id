import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (!process.env.__CHATBOT_ROUTE_CHECK_TS) {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('tsx');
  const hasil = spawnSync(process.execPath, ['--import', pathToFileURL(loader).href, fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, __CHATBOT_ROUTE_CHECK_TS: '1' },
  });
  process.exit(hasil.status ?? 1);
}

// Stub mongoose.connect dan Settings sebelum route dipanggil
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/uji-route';
process.env.CHATBOT_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const mongoose = (await import('mongoose')).default;
mongoose.connect = async () => mongoose;
const { Settings } = await import('../src/models/Settings.ts');
const { enkripsiChatbotSecret } = await import('../src/lib/chatbotSecret.ts');
const { POST } = await import('../src/app/api/chat/route.ts');

function buatRequest(body, init = {}) {
  const teks = typeof body === 'string' ? body : JSON.stringify(body);
  const { headers: tambahan, stream, ...sisa } = init;
  if (stream) {
    // Simulasi ReadableStream tanpa content-length (misal transfer chunked)
    const encoder = new TextEncoder();
    const potongan = Array.isArray(stream) ? stream : [stream];
    const s = new ReadableStream({
      start(c) {
        for (const p of potongan) c.enqueue(typeof p === 'string' ? encoder.encode(p) : p);
        c.close();
      },
    });
    const headers = new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...tambahan,
    });
    return new Request('http://localhost:9532/api/chat', { method: 'POST', ...sisa, headers, body: s, duplex: 'half' });
  }
  const headers = new Headers({
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(teks, 'utf8')),
    'x-forwarded-for': '127.0.0.1',
    ...tambahan,
  });
  return new Request('http://localhost:9532/api/chat', { method: 'POST', ...sisa, headers, body: teks });
}

// 1. Content-Type non-JSON dijawab 415
{
  const res = await POST(buatRequest('halo', { headers: { 'content-type': 'text/plain' } }));
  assert.equal(res.status, 415, 'Content-Type non-JSON harus dijawab 415');
}

// 2. Body melebihi batas 32 KB dijawab 413 (header length dan stream chunk overflow tanpa length)
{
  const raksasa = JSON.stringify({ pesan: 'x'.repeat(33 * 1024) });
  const res = await POST(buatRequest(raksasa));
  assert.equal(res.status, 413, 'Content-Length melebihi 32 KB harus dijawab 413');

  // Chunk stream overflow tanpa content-length
  const chunk1 = '{"pesan":"' + 'a'.repeat(20 * 1024);
  const chunk2 = 'b'.repeat(15 * 1024) + '"}';
  const resStream = await POST(buatRequest('', { stream: [chunk1, chunk2] }));
  assert.equal(resStream.status, 413, 'Stream chunk overflow >32 KB tanpa content-length harus dijawab 413');

  // Malformed / mismatched content-length
  const resFormat = await POST(buatRequest({ pesan: 'halo' }, { headers: { 'content-length': 'bukan-angka' } }));
  assert.equal(resFormat.status, 400, 'Content-length bukan angka harus 400');
  const resMismatch = await POST(buatRequest({ pesan: 'halo' }, { headers: { 'content-length': '999' } }));
  assert.equal(resMismatch.status, 400, 'Content-length tidak cocok byte aktual harus 400');
}

// 3. Body bukan JSON atau format salah dijawab 400
{
  const res = await POST(buatRequest('{rusak'));
  assert.equal(res.status, 400, 'JSON rusak harus dijawab 400');
  const res2 = await POST(buatRequest({ pesan: '' }));
  assert.equal(res2.status, 400, 'Pesan kosong harus dijawab 400');
  const res3 = await POST(buatRequest({ pesan: 'halo', riwayat: [{ peran: 'system', isi: 'banned' }] }));
  assert.equal(res3.status, 400, 'Peran selain user/assistant harus dijawab 400');
  const res4 = await POST(buatRequest({ pesan: 'halo', asing: true }));
  assert.equal(res4.status, 400, 'Field asing pada body harus dijawab 400');
}

// 4. Origin asing dijawab 403
{
  const res = await POST(buatRequest({ pesan: 'halo' }, {
    headers: {
      origin: 'https://attacker.example',
      host: 'localhost:9532',
      'x-forwarded-proto': 'http',
    },
  }));
  assert.equal(res.status, 403, 'Origin asing harus ditolak 403');
}

// 5. Uji status Settings (OFF, hilang key, aktif per provider)
function setSettings(chatbot) {
  Settings.findOne = () => ({
    select: () => ({
      maxTimeMS: () => ({
        lean: async () => ({ singleton: 'main', chatbot }),
      }),
    }),
  });
}

// 5a. Chatbot nonaktif / dokumen null -> 503 + tawarkanWhatsApp: true
{
  setSettings(null);
  const res = await POST(buatRequest({ pesan: 'Berapa biaya kuliah?' }, { headers: { 'x-forwarded-for': '10.0.0.1' } }));
  assert.equal(res.status, 503, 'Chatbot null harus 503');
  const json = await res.json();
  assert.equal(json.status, 'temporarily_unavailable');
  assert.equal(json.tawarkanWhatsApp, true);

  setSettings({ aktif: false, provider: 'openrouter' });
  const resOff = await POST(buatRequest({ pesan: 'Halo' }, { headers: { 'x-forwarded-for': '10.0.0.2' } }));
  assert.equal(resOff.status, 503, 'Chatbot aktif:false harus 503');
}

// 5b. Chatbot aktif tapi key kosong atau tidak terdekripsi -> 503
{
  setSettings({ aktif: true, provider: 'openrouter', apiKeyOpenRouter: '' });
  const res = await POST(buatRequest({ pesan: 'Halo' }, { headers: { 'x-forwarded-for': '10.0.0.3' } }));
  assert.equal(res.status, 503, 'API key kosong harus 503');

  setSettings({ aktif: true, provider: 'openrouter', apiKeyOpenRouter: 'v1:kunci-rusak:rusak:rusak' });
  const resRusak = await POST(buatRequest({ pesan: 'Halo' }, { headers: { 'x-forwarded-for': '10.0.0.4' } }));
  assert.equal(resRusak.status, 503, 'API key gagal dekripsi harus 503');
}

// 5c. Jalur aktif: provider terpilih dipanggil via mock fetch tanpa request sungguhan
{
  const kunciOpenRouter = enkripsiChatbotSecret('sk-or-uji');
  const kunciDeepSeek = enkripsiChatbotSecret('sk-ds-uji');
  const kunciGemini = enkripsiChatbotSecret('sk-gem-uji');

  let dipanggil;
  let urutan = [];
  const fetchAsli = globalThis.fetch;
  const balasan = (payload) => new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
  const akhir = { choices: [{ message: { content: '{"status":"no_source"}' } }], candidates: [{ content: { parts: [{ text: '{"status":"no_source"}' }] } }] };
  globalThis.fetch = async (url, init) => {
    dipanggil = { url, init };
    return balasan(urutan.shift() ?? akhir);
  };
  const { FAQ } = await import('../src/models/FAQ.ts');
  FAQ.find = () => {
    const rantai = { select: () => rantai, limit: () => rantai, maxTimeMS: () => rantai, lean: async () => [{ _id: 'f1', pertanyaan: 'Cara daftar?', jawaban: 'Pendaftaran dilakukan secara online.', kategori: 'umum', aktif: true }] };
    return rantai;
  };

  try {
    // OpenRouter aktif: putaran tool lalu jawaban berbukti.
    setSettings({ aktif: true, provider: 'openrouter', apiKeyOpenRouter: kunciOpenRouter });
    urutan = [
      { choices: [{ message: { content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'cari_faq', arguments: '{"kataKunci":"daftar"}' } }] } }] },
      { choices: [{ message: { content: '{"status":"answered","buktiIds":["faq:f1"],"jawaban":"Pendaftaran dilakukan secara online."}' } }] },
    ];
    let res = await POST(buatRequest({ pesan: 'Bagaimana cara daftar?' }, { headers: { 'x-forwarded-for': '10.0.0.10' } }));
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'answered', 'jalur aktif dengan tool harus answered');
    assert.equal(json.jawaban, 'Pendaftaran dilakukan secara online.');
    assert.deepEqual(json.sumber, [{ judul: 'Cara daftar?', url: '/faq' }], 'sumber dari bukti tool');
    assert.equal(dipanggil.url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(dipanggil.init.headers.authorization, 'Bearer sk-or-uji');

    // DeepSeek aktif
    setSettings({ aktif: true, provider: 'deepseek', apiKeyDeepSeek: kunciDeepSeek });
    urutan = [];
    res = await POST(buatRequest({ pesan: 'Halo' }, { headers: { 'x-forwarded-for': '10.0.0.11' } }));
    assert.equal(res.status, 200);
    assert.equal(dipanggil.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(dipanggil.init.headers.authorization, 'Bearer sk-ds-uji');

    // Gemini aktif
    setSettings({ aktif: true, provider: 'gemini', apiKeyGemini: kunciGemini });
    urutan = [];
    res = await POST(buatRequest({ pesan: 'Halo' }, { headers: { 'x-forwarded-for': '10.0.0.12' } }));
    assert.equal(res.status, 200);
    assert.match(dipanggil.url, /^https:\/\/generativelanguage\.googleapis\.com\/.*:generateContent$/);
    assert.equal(dipanggil.init.headers['x-goog-api-key'], 'sk-gem-uji');
  } finally {
    globalThis.fetch = fetchAsli;
  }
}

// 5d. Anggaran bukti model: multi-tool dengan bukti besar berhenti aman sebelum fetch kedua.
{
  const kunci = enkripsiChatbotSecret('sk-or-budget');
  let panggilan = 0;
  const bodyBytes = [];
  const fetchAsli = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    panggilan += 1;
    bodyBytes.push(Buffer.byteLength(String(init.body), 'utf8'));
    return new Response(JSON.stringify({
      choices: [{ message: { content: '', tool_calls: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, type: 'function', function: { name: 'cari_faq', arguments: '{"kataKunci":"x"}' } })) } }],
    }), { headers: { 'content-type': 'application/json' } });
  };
  const { FAQ } = await import('../src/models/FAQ.ts');
  FAQ.find = () => {
    const rantai = { select: () => rantai, limit: () => rantai, maxTimeMS: () => rantai, lean: async () => Array.from({ length: 4 }, (_, i) => ({ _id: `f${i}`, pertanyaan: 'Q', jawaban: 'x'.repeat(2000), kategori: 'umum', aktif: true })) };
    return rantai;
  };
  setSettings({ aktif: true, provider: 'openrouter', apiKeyOpenRouter: kunci });
  try {
    const res = await POST(buatRequest({ pesan: 'halo' }, { headers: { 'x-forwarded-for': '10.0.0.50' } }));
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.status, 'clarification_needed', 'bukti model melebihi anggaran harus klarifikasi');
    assert.equal(panggilan, 1, 'tidak boleh fetch kedua setelah anggaran bukti terlampaui');
    assert.ok(bodyBytes.every((n) => n <= 64 * 1024), 'body provider tidak boleh melebihi 64KB');
  } finally {
    globalThis.fetch = fetchAsli;
  }
}

// 5e. Daftar prodi wajar (12 baris) diteruskan ke model untuk dirangkum, bukan dipotong klarifikasi.
{
  const kunci = enkripsiChatbotSecret('sk-or-daftar');
  const fetchAsli = globalThis.fetch;
  const urutan = [
    { choices: [{ message: { content: '', tool_calls: [{ id: 'p1', type: 'function', function: { name: 'cari_prodi', arguments: '{}' } }] } }] },
    { choices: [{ message: { content: '{"status":"answered","jawaban":"Ada beberapa program studi, di antaranya Informatika dan Pendidikan Dokter."}' } }] },
  ];
  globalThis.fetch = async () => new Response(JSON.stringify(urutan.shift()), { headers: { 'content-type': 'application/json' } });
  const { ProgramStudi } = await import('../src/models/ProgramStudi.ts');
  ProgramStudi.find = () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ _id: `p${i}`, nama: `Prodi ${i}`, singkatan: `P${i}`, akreditasi: 'Baik', persyaratan: [], aktif: true, jenjang_id: { nama: 'Sarjana' }, fakultas_id: { nama: 'Teknik' } }));
    const rantai = { select: () => rantai, populate: () => rantai, limit: () => rantai, maxTimeMS: () => rantai, lean: async () => rows };
    return rantai;
  };
  setSettings({ aktif: true, provider: 'openrouter', apiKeyOpenRouter: kunci });
  try {
    const res = await POST(buatRequest({ pesan: 'ada prodi apa saja?' }, { headers: { 'x-forwarded-for': '10.0.0.60' } }));
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.status, 'answered', 'daftar 12 prodi harus dirangkum model, bukan klarifikasi');
    assert.match(json.jawaban, /Pendidikan Dokter/);
  } finally {
    globalThis.fetch = fetchAsli;
  }
}

// 5f. Sapaan murni yang gagal dijawab model tetap dibalas ramah dengan status answered.
{
  const kunci = enkripsiChatbotSecret('sk-or-sapa');
  const fetchAsli = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"status":"no_source"}' } }] }), { headers: { 'content-type': 'application/json' } });
  setSettings({ aktif: true, provider: 'openrouter', apiKeyOpenRouter: kunci });
  try {
    const res = await POST(buatRequest({ pesan: 'hai' }, { headers: { 'x-forwarded-for': '10.0.0.70' } }));
    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.status, 'answered', 'sapaan harus answered, bukan clarification_needed');
    assert.match(json.jawaban, /Halo/);
    assert.equal(json.tawarkanWhatsApp, false);
  } finally {
    globalThis.fetch = fetchAsli;
  }
}

// 6. Rate limit per IP (15 request per menit) -> 429
{
  setSettings({ aktif: false });
  const ip = '192.168.1.77';
  let terkenaLimit = false;
  for (let i = 0; i < 20; i++) {
    const res = await POST(buatRequest({ pesan: 'halo' }, { headers: { 'x-forwarded-for': ip } }));
    if (res.status === 429) {
      terkenaLimit = true;
      const data = await res.json();
      assert.equal(data.status, 'temporarily_unavailable');
      assert.equal(data.tawarkanWhatsApp, true);
      break;
    }
  }
  assert.ok(terkenaLimit, 'Rate limit per IP 15/menit harus aktif dan menjawab 429');
}

console.log('check-chatbot-route: all route behavioral assertions passed');
