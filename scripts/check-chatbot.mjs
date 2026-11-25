import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const baca = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Jalankan ulang lewat loader tsx agar uji perilaku dapat mengimpor modul TypeScript.
if (!process.env.__CHATBOT_CHECK_TS) {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('tsx');
  const hasil = spawnSync(process.execPath, ['--import', pathToFileURL(loader).href, fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, __CHATBOT_CHECK_TS: '1' },
  });
  process.exit(hasil.status ?? 1);
}

const prodiModel = baca('src/models/ProgramStudi.ts');
const biayaModel = baca('src/models/Biaya.ts');

// Task 1: Flag aktif ProgramStudi dan Biaya
assert.match(
  prodiModel,
  /aktif:\s*\{\s*type:\s*Boolean,\s*default:\s*true,\s*index:\s*true\s*\}/,
  'ProgramStudi harus memiliki field aktif dengan default true dan index true',
);
console.log('Task 1: Model ProgramStudi aktif field OK');

assert.match(
  biayaModel,
  /aktif:\s*\{\s*type:\s*Boolean,\s*default:\s*true,\s*index:\s*true\s*\}/,
  'Biaya harus memiliki field aktif dengan default true dan index true',
);
console.log('Task 1: Model Biaya aktif field OK');

// Cek route API admin menerima aktif
const prodiRoute = baca('src/app/api/admin/program-studi/route.ts');
const prodiIdRoute = baca('src/app/api/admin/program-studi/[id]/route.ts');
const biayaRoute = baca('src/app/api/admin/biaya/route.ts');
const biayaIdRoute = baca('src/app/api/admin/biaya/[id]/route.ts');

assert.match(prodiRoute, /aktif:\s*z\.boolean\(\)\.optional\(\)/, 'POST ProgramStudi harus menerima aktif opsional');
assert.match(prodiIdRoute, /aktif:\s*z\.boolean\(\)\.optional\(\)/, 'PUT ProgramStudi harus menerima aktif opsional');
assert.match(biayaRoute, /aktif:\s*z\.boolean\(\)\.optional\(\)/, 'POST Biaya harus menerima aktif opsional');
assert.match(biayaIdRoute, /aktif:\s*z\.boolean\(\)\.optional\(\)/, 'PUT Biaya harus menerima aktif opsional');
console.log('Task 1: API routes aktif validation OK');

// ── Task 3: uji perilaku backend ─────────────────────────────────────────────
// DB di-mock: koneksi tidak menyentuh Mongo sungguhan, model di bawah di-stub.
process.env.MONGO_URI ||= 'mongodb://127.0.0.1:27017/uji-chatbot';
const mongoose = (await import('mongoose')).default;
mongoose.connect = async () => mongoose;
const { statusJadwal, regexAman, hanyaAktif, argSchema, jalankanTool, TOOLS, KlarifikasiError, KonflikError } = await import('../src/lib/chatbot/tools.ts');
const { panggilModel, normalisasiOpenAI, normalisasiGemini } = await import('../src/lib/chatbot/providers.ts');
const { susunHasilChat, hasilStatus, batasiRiwayat, adalahSapaan } = await import('../src/lib/chatbot/hasil.ts');
for (const klarifikasi of ['Apakah maksud Anda biaya Rp50.000.000 per semester?', 'Apakah maksud Anda kuliah gratis?', 'Berapa masa studi yang dimaksud?']) {
  const respons = susunHasilChat(JSON.stringify({ status: 'clarification_needed', klarifikasi }), []);
  assert.equal(respons.jawaban, hasilStatus('clarification_needed').jawaban, 'klarifikasi sensitif harus memakai pesan aman');
}

// Status jadwal memakai hari kalender Asia/Jakarta; hari terakhir masih dibuka.
const now = new Date('2026-11-24T05:00:00Z');
assert.equal(statusJadwal('2026-11-25T00:00:00Z', '2026-11-30T00:00:00Z', now), 'belum', 'jadwal masa depan belum dibuka');
assert.equal(statusJadwal('2026-11-20T00:00:00Z', '2026-11-24T00:00:00Z', now), 'dibuka', 'jadwal berjalan dibuka');
assert.equal(statusJadwal('2026-11-20T00:00:00Z', '2026-11-23T00:00:00Z', now), 'ditutup', 'jadwal lampau ditutup');
assert.equal(statusJadwal('2026-11-20T00:00:00Z', '2026-11-24T00:00:00Z', new Date('2026-11-24T16:59:00Z')), 'dibuka', '23.59 WIB hari terakhir masih dibuka');
assert.equal(statusJadwal('2026-11-20T00:00:00Z', '2026-11-24T00:00:00Z', new Date('2026-11-24T17:00:00Z')), 'ditutup', '00.00 WIB hari berikutnya sudah ditutup');
console.log('Task 3: statusJadwal (Asia/Jakarta) OK');

// Regex pengguna di-escape; dokumen tanpa aktif:true tidak lolos.
const re = regexAman('a.*b');
assert.equal(re.test('a.*b'), true, 'regex harus cocok dengan teks literal');
assert.equal(re.test('aXXb'), false, 'metakarakter pengguna tidak boleh aktif');
assert.deepEqual(
  hanyaAktif([{ aktif: true }, { aktif: false }, {}, { aktif: 1 }, { aktif: 'true' }]),
  [{ aktif: true }],
  'hanya dokumen aktif:true eksplisit yang boleh dipakai',
);
assert.throws(() => argSchema.parse({ asing: 'x' }), 'argumen tool asing harus ditolak');
await assert.rejects(jalankanTool('tulis_data', {}), /Tool tidak valid/, 'tool tulis/asing harus ditolak sebelum DB');
await assert.rejects(jalankanTool('cari_faq', { asing: 'x' }), 'argumen tool tidak valid harus ditolak sebelum DB');
console.log('Task 3: escaping, filter aktif, dan dispatch tool OK');

// ── Query nyata enam tool dengan model di-mock (tanpa Mongo) ─────────────────
const { ProgramStudi } = await import('../src/models/ProgramStudi.ts');
const { Biaya } = await import('../src/models/Biaya.ts');
const { Jadwal } = await import('../src/models/Jadwal.ts');
const { JalurSeleksi } = await import('../src/models/JalurSeleksi.ts');
const { FAQ } = await import('../src/models/FAQ.ts');
const { Dokumen } = await import('../src/models/Dokumen.ts');
const { Pengumuman } = await import('../src/models/Pengumuman.ts');
const { cariProdi, cariJadwal, cariBiaya, cariFaq, cariDokumen, cariPengumuman } = await import('../src/lib/chatbot/tools.ts');

function pasangModel(model, hasil) {
  const rekam = { query: [], populate: [] };
  model.find = (query) => {
    rekam.query.push(query);
    const rantai = {
      select: () => rantai,
      populate: (...args) => { rekam.populate.push(args); return rantai; },
      limit: () => rantai,
      sort: () => rantai,
      maxTimeMS: () => rantai,
      lean: async () => hasil,
    };
    return rantai;
  };
  return rekam;
}
const prodiA = { _id: 'p1', nama: 'Informatika', singkatan: 'IF', akreditasi: 'Baik Sekali', persyaratan: ['Lulus SMA'], aktif: true, jenjang_id: { nama: 'Sarjana' }, fakultas_id: { nama: 'Teknik' } };
const prodiOff = { ...prodiA, _id: 'p2', nama: 'Nonaktif', aktif: false };
const jalurA = { _id: 'j1', nama: 'Prestasi', aktif: true };
const kelasA = { _id: 'k1', nama: 'Reguler' };
const jadwalA = { _id: 'jd1', judul: 'Gelombang 1', tahun: '2026', ke: 1, mulai: new Date('2026-11-20T00:00:00Z'), selesai: new Date('2026-11-24T00:00:00Z'), status: true, jalur: ['j1'] };
const faqAktif = { _id: 'f1', pertanyaan: 'Cara daftar?', jawaban: 'Daftar online.', kategori: 'umum', aktif: true };
const faqOff = { ...faqAktif, _id: 'f2', aktif: false };
const dokAktif = { _id: 'd1', judul: 'Panduan', tahun: '2026', kategori: 'panduan', aktif: true };
const dokOff = { ...dokAktif, _id: 'd2', aktif: false };
const pengAktif = { _id: 'n1', judul: 'Pengumuman', ringkasan: 'Ringkas.', slug: 'pengumuman', aktif: true };
const pengOff = { ...pengAktif, _id: 'n2', aktif: false };

let rekam = pasangModel(ProgramStudi, [prodiA, prodiOff]);
let hasil = await cariProdi({ nama: 'Informatika' });
assert.deepEqual(rekam.query[0], { aktif: true, nama: /Informatika/i }, 'cariProdi wajib query aktif:true');
assert.equal(rekam.populate.length, 2, 'cariProdi harus populate jenjang/fakultas');
assert.equal(hasil.length, 1, 'prodi nonaktif harus tersaring');
assert.equal(hasil[0].id, 'prodi:p1');

rekam = pasangModel(JalurSeleksi, [jalurA]);
const rekamJadwal = pasangModel(Jadwal, [jadwalA]);
hasil = await cariJadwal({ jalur: 'Prestasi' });
assert.deepEqual(rekamJadwal.query[0], { status: true, jalur: { $in: ['j1'] } }, 'cariJadwal wajib status:true dan jalur aktif');
assert.equal(hasil[0].id, 'jadwal:jd1');
assert.match(hasil[0].ringkas, /Status pendaftaran: (dibuka|ditutup|belum)/, 'status jadwal dihitung Jakarta');

const biayaA = { _id: 'b1', aktif: true, biaya: 100000, biayaPerSemester: 5000000, biayaTambahan: 25000, persentase: [50, 100], programStudi_id: prodiA, jalur_id: jalurA, jadwal_id: jadwalA, kelas_id: kelasA };
rekam = pasangModel(Biaya, [biayaA]);
hasil = await cariBiaya({ prodi: 'Informatika' });
assert.deepEqual(rekam.query[0], { aktif: true }, 'cariBiaya wajib query aktif:true');
assert.equal(rekam.populate[0][0].match.aktif, true, 'populate prodi wajib aktif:true');
assert.equal(rekam.populate[1][0].match.aktif, true, 'populate jalur wajib aktif:true');
assert.equal(rekam.populate[2][0].match.status, true, 'populate jadwal wajib status:true');
assert.equal(hasil[0].id, 'biaya:b1');
assert.match(hasil[0].ringkas, /Biaya pokok: Rp\s*100\.000/, 'nominal dari DB');

// Kombinasi identitas berbeda = klarifikasi, bukan konflik.
const prodiB = { ...prodiA, _id: 'p3', nama: 'Sistem Informasi' };
const jadwalB = { ...jadwalA, _id: 'jd2', judul: 'Gelombang 2', ke: 2 };
pasangModel(Biaya, [biayaA, { ...biayaA, _id: 'b2', programStudi_id: prodiB, jadwal_id: jadwalB }]);
await assert.rejects(cariBiaya({ prodi: 'Informatika' }), (e) => e instanceof KlarifikasiError && !(e instanceof KonflikError), 'prodi/periode berbeda tidak boleh dianggap konflik');

// Kombinasi identik dengan nominal berbeda = konflik.
pasangModel(Biaya, [biayaA, { ...biayaA, _id: 'b3', biaya: 150000 }]);
await assert.rejects(cariBiaya({ prodi: 'Informatika' }), (e) => e instanceof KonflikError, 'kombinasi identik nominal berbeda wajib konflik');

rekam = pasangModel(FAQ, [faqAktif, faqOff]);
hasil = await cariFaq({ kataKunci: 'daftar' });
assert.deepEqual(rekam.query[0], { aktif: true, $or: [{ pertanyaan: /daftar/i }, { jawaban: /daftar/i }] }, 'cariFaq wajib aktif:true');
assert.equal(hasil.length, 1, 'FAQ nonaktif harus tersaring');
assert.equal(hasil[0].id, 'faq:f1');

rekam = pasangModel(Dokumen, [dokAktif, dokOff]);
hasil = await cariDokumen({ kataKunci: 'Panduan' });
assert.deepEqual(rekam.query[0], { aktif: true, judul: /Panduan/i }, 'cariDokumen wajib aktif:true');
assert.equal(hasil.length, 1, 'Dokumen nonaktif harus tersaring');
assert.match(hasil[0].ringkas, /Hanya metadata/, 'Dokumen tidak boleh mengekstrak isi');

rekam = pasangModel(Pengumuman, [pengAktif, pengOff]);
hasil = await cariPengumuman({ kataKunci: 'Pengumuman' });
assert.equal(rekam.query[0].aktif, true, 'cariPengumuman wajib aktif:true');
assert.ok(rekam.query[0].publishedAt.$lte instanceof Date, 'cariPengumuman wajib publishedAt <= sekarang');
assert.equal(hasil.length, 1, 'Pengumuman nonaktif harus tersaring');
assert.equal(hasil[0].id, 'pengumuman:n1');
console.log('Task 3: enam query tool + populate + filter aktif OK');

// Pencarian akar kata: "kedokteran" harus menemukan "Pendidikan Dokter".
{
  const dokter = { _id: 'p9', nama: 'Pendidikan Dokter S-1', singkatan: 'PD', akreditasi: 'Unggul', persyaratan: [], aktif: true, jenjang_id: { nama: 'Sarjana' }, fakultas_id: { nama: 'Kedokteran' } };
  let panggilan = 0;
  ProgramStudi.find = () => {
    panggilan++;
    const hasil = panggilan === 1 ? [] : [dokter];
    const rantai = { select: () => rantai, populate: () => rantai, limit: () => rantai, sort: () => rantai, maxTimeMS: () => rantai, lean: async () => hasil };
    return rantai;
  };
  const hasil = await cariProdi({ nama: 'kedokteran' });
  assert.equal(panggilan, 2, 'hasil kosong harus mencoba akar kata');
  assert.equal(hasil.length, 1, 'akar kata "dokter" harus menemukan Pendidikan Dokter');
  assert.equal(hasil[0].id, 'prodi:p9');
}
console.log('Task 3: fallback akar kata prodi OK');

// Normalisasi keluaran provider.
const openai = normalisasiOpenAI({
  choices: [{ message: { content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'cari_faq', arguments: '{"kataKunci":"biaya"}' } }] } }],
});
assert.equal(openai.panggilanTool[0].nama, 'cari_faq');
assert.deepEqual(openai.panggilanTool[0].argumen, { kataKunci: 'biaya' });
const gemini = normalisasiGemini({
  candidates: [{ content: { parts: [{ text: 'Halo' }, { thought: true, text: 'rahasia' }, { functionCall: { name: 'cari_prodi', args: { nama: 'Informatika' } } }] } }],
});
assert.equal(gemini.pesan, 'Halo');
assert.equal(gemini.panggilanTool[0].nama, 'cari_prodi');
assert.deepEqual(gemini.panggilanTool[0].argumen, { nama: 'Informatika' });
assert.throws(() => normalisasiOpenAI({ choices: [{ message: { content: '', tool_calls: [{ function: { name: 'nama tidak valid', arguments: '{}' } }] } }] }), 'nama tool upstream tidak valid harus ditolak');
assert.throws(() => normalisasiOpenAI({ choices: [{ message: { content: '', tool_calls: [{ function: { name: 'cari_faq', arguments: '{rusak' } }] } }] }), 'argumen tool bukan JSON harus ditolak');
console.log('Task 3: normalisasi provider OK');

// HTTP provider di-mock penuh: tanpa panggilan berbayar.
const jsonResponse = (payload, tipe = 'application/json') => new Response(JSON.stringify(payload), { headers: { 'content-type': tipe } });
const jawabanOpenAI = { choices: [{ message: { content: '{"status":"answered","buktiIds":["faq:1"]}' } }] };
const alat = [{ name: 'cari_faq', description: 'FAQ', parameters: { type: 'object' } }];
let ditangkap;
const fetchPalsu = (payload) => async (url, init) => { ditangkap = { url, init }; return jsonResponse(payload); };

await panggilModel({ provider: 'openrouter', model: 'google/gemini-2.0-flash-001', apiKey: 'kunci-uji', messages: [{ peran: 'user', isi: 'halo' }], tools: alat, opsi: { fetch: fetchPalsu(jawabanOpenAI) } });
assert.equal(ditangkap.url, 'https://openrouter.ai/api/v1/chat/completions', 'URL OpenRouter harus tetap allowlist');
assert.equal(ditangkap.init.headers.authorization, 'Bearer kunci-uji');
assert.equal(JSON.parse(ditangkap.init.body).tools[0].type, 'function');

await panggilModel({ provider: 'deepseek', model: 'deepseek-chat', apiKey: 'kunci-uji', messages: [{ peran: 'user', isi: 'halo' }], tools: [], opsi: { fetch: fetchPalsu(jawabanOpenAI) } });
assert.equal(ditangkap.url, 'https://api.deepseek.com/chat/completions', 'URL DeepSeek harus tetap allowlist');
assert.equal(JSON.parse(ditangkap.init.body).tools, undefined, 'permintaan tanpa tool tidak mengirim tools');

const jawabanGemini = { candidates: [{ content: { parts: [{ text: '{"status":"no_source"}' }] } }] };
await panggilModel({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'kunci-uji', messages: [{ peran: 'user', isi: 'halo' }], tools: TOOLS, opsi: { fetch: fetchPalsu(jawabanGemini) } });
assert.equal(ditangkap.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', 'URL Gemini harus tetap allowlist');
assert.equal(ditangkap.init.headers['x-goog-api-key'], 'kunci-uji');
const deklarasiGemini = JSON.parse(ditangkap.init.body).tools[0].functionDeclarations[0];
assert.equal(deklarasiGemini.name, 'cari_prodi');
assert.equal(deklarasiGemini.parameters, undefined, 'Gemini tidak boleh memakai Schema OpenAPI terbatas');
assert.equal(deklarasiGemini.parametersJsonSchema.type, 'object', 'Gemini wajib parametersJsonSchema penuh');
assert.equal(deklarasiGemini.parametersJsonSchema.additionalProperties, false, 'additionalProperties:false harus sampai utuh');
assert.ok(deklarasiGemini.parametersJsonSchema.properties.kataKunci, 'seluruh properti tool harus terkirim');
await assert.rejects(panggilModel({ provider: 'openrouter', model: 'm', apiKey: 'k', messages: [], tools: [], opsi: { fetch: async () => new Response('{}', { headers: { 'content-type': 'text/plain' } }) } }), 'content-type non-JSON harus ditolak');
await assert.rejects(panggilModel({ provider: 'openrouter', model: 'm', apiKey: 'k', messages: [], tools: [], opsi: { fetch: async () => new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } }) } }), 'HTTP error harus ditolak');
await assert.rejects(panggilModel({ provider: 'openrouter', model: 'm', apiKey: 'k', messages: [], tools: [], opsi: { fetch: async () => jsonResponse({ choices: [] }), maxByte: 5 } }), 'body upstream melebihi batas harus ditolak');
console.log('Task 3: adaptor provider (mock HTTP, cap) OK');

// Evidence: model tidak boleh mengarang URL/status answered tanpa bukti.
const buktiFaq = [{ id: 'faq:1', judul: 'Cara daftar', ringkas: 'Pendaftaran dilakukan secara online melalui situs resmi.', url: '/faq' }];
const sah = susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1'], jawaban: 'Pendaftaran dilakukan secara online melalui situs resmi. https://situs-palsu.example', sumber: [{ judul: 'Palsu', url: 'https://situs-palsu.example' }] }), buktiFaq);
assert.equal(sah.status, 'answered');
assert.deepEqual(sah.sumber, [{ judul: 'Cara daftar', url: '/faq' }], 'sumber hanya dari metadata bukti');
assert.deepEqual(Object.keys(sah.sumber[0]).sort(), ['judul', 'url'], 'sumber hanya memproyeksikan field publik');
assert.ok(!sah.jawaban.includes('situs-palsu'), 'URL karangan model tidak boleh muncul');
assert.equal(sah.tawarkanWhatsApp, false);
assert.equal(sah.jawaban, 'Pendaftaran dilakukan secara online melalui situs resmi.', 'jawaban fokus dipakai, bukan dump seluruh baris');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1'] }), []).status, 'no_source', 'answered tanpa bukti harus no_source');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['karangan:9'], jawaban: 'Halo.' }), buktiFaq).status, 'no_source', 'ID bukti karangan harus no_source');
assert.equal(susunHasilChat('bukan json', buktiFaq).status, 'no_source', 'keluaran rusak harus no_source');
assert.equal(susunHasilChat(JSON.stringify({ status: 'out_of_scope' }), buktiFaq).tawarkanWhatsApp, true);
assert.equal(susunHasilChat(JSON.stringify({ status: 'clarification_needed', klarifikasi: 'Sebutkan prodi.' }), buktiFaq).tawarkanWhatsApp, false);
assert.equal(hasilStatus('temporarily_unavailable').tawarkanWhatsApp, true);

// Klaim angka/uang/tanggal hanya boleh dari bukti terstruktur yang dipilih.
const buktiBiaya = [{
  id: 'biaya:b1', judul: 'Biaya Informatika',
  ringkas: 'Biaya pokok: Rp100.000. Estimasi biaya per semester: Rp5.000.000. Pilihan persentase pembayaran: 50, 100. 20 November 2026 sampai 24 November 2026 WIB.',
  url: '/#kalkulator',
}];
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1'], jawaban: 'Biaya pokok: Rp100.000.' }), buktiBiaya).status, 'answered', 'kalimat persis dari tabel biaya boleh');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1'], jawaban: 'Estimasi biaya per semester: Rp5.000.000.' }), buktiBiaya).status, 'answered', 'kalimat nominal persis boleh');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1'], jawaban: 'Biaya pendaftaran Rp999.000.' }), buktiBiaya).status, 'no_source', 'nominal karangan harus ditolak');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1'], jawaban: 'Pendaftaran ditutup 1 Januari 2027.' }), buktiBiaya).status, 'no_source', 'tanggal karangan harus ditolak');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1'], jawaban: 'Total biaya sampai lulus sekitar Rp40.000.000.' }), buktiBiaya).status, 'no_source', 'total sampai lulus tidak boleh ditebak');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1'], jawaban: 'Masa studi 4 tahun.' }), buktiBiaya).status, 'no_source', 'masa studi tidak boleh ditebak');
const buktiFaqNominal = [{ id: 'faq:1', judul: 'Biaya', ringkas: 'Biaya pokok: Rp50.000.', url: '/faq' }];
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1', 'biaya:b1'], jawaban: 'Biaya pokok: Rp100.000.' }), [...buktiFaqNominal, ...buktiBiaya]).status, 'no_source', 'FAQ bernominal berbeda harus menolak klaim tabel biaya');
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1', 'biaya:b1'], jawaban: 'Biaya pokok: Rp50.000.' }), [...buktiFaqNominal, ...buktiBiaya]).status, 'no_source', 'nominal FAQ tidak boleh dipakai sebagai biaya resmi');
{ // Label berbeda tetapi entitas sama (token penting beririsan) tetap dianggap konflik.
  const tabel = [{ id: 'biaya:b2', judul: 'Pendaftaran', ringkas: 'Biaya pendaftaran: Rp100.000.', url: '/#kalkulator' }];
  const faq = [{ id: 'faq:2', judul: 'Pendaftaran', ringkas: 'Biaya pendaftaran: Rp50.000.', url: '/faq' }];
  assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b2', 'faq:2'], jawaban: 'Biaya pendaftaran: Rp100.000.' }), [...tabel, ...faq]).status, 'no_source', 'konflik label sebanding harus ditolak');
}
assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1'], jawaban: 'Pendaftaran gratis.' }), buktiFaq).status, 'no_source', 'FAQ saja tidak boleh mengklaim biaya');
{ // Fakta prosedural berangka dari FAQ tetap boleh; bukan biaya/kalender.
  const prosedur = [
    { id: 'faq:p1', judul: 'Foto', ringkas: 'Lampirkan pas foto ukuran 3x4.', url: '/faq' },
    { id: 'faq:p2', judul: 'Verifikasi', ringkas: 'Verifikasi memerlukan 2-5 hari.', url: '/faq' },
  ];
  assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:p1'], jawaban: 'Lampirkan pas foto ukuran 3x4.' }), prosedur).status, 'answered', 'ukuran foto prosedural tidak boleh diblokir');
  assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:p2'], jawaban: 'Verifikasi memerlukan 2-5 hari.' }), prosedur).status, 'answered', 'durasi prosedural tidak boleh diblokir');
  // Bukti biaya terstruktur tetap valid walau ada FAQ berangka tidak terkait.
  assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['biaya:b1', 'faq:p2'], jawaban: 'Biaya pokok: Rp100.000.' }), [...buktiBiaya, ...prosedur]).status, 'answered', 'FAQ berangka tidak terkait tidak boleh membatalkan biaya');
}
{ // Tanggal resmi dari FAQ ditolak; konflik tanggal berlabel sama juga ditolak.
  const jadwal = { id: 'jadwal:j1', judul: 'Jadwal', ringkas: 'Pendaftaran ditutup 24 November 2026.', url: '/jadwal-pmb' };
  const faq = { id: 'faq:d1', judul: 'Jadwal', ringkas: 'Pendaftaran ditutup 25 November 2026.', url: '/faq' };
  assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:d1'], jawaban: faq.ringkas }), [faq]).status, 'no_source');
  assert.equal(susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['jadwal:j1'], jawaban: jadwal.ringkas }), [jadwal, faq]).status, 'no_source');
}
{ // Jawaban fokus satu kalimat, bukan dump seluruh baris.
  const dua = [
    { id: 'faq:1', judul: 'A', ringkas: 'Pendaftaran dilakukan secara online.', url: '/faq' },
    { id: 'faq:2', judul: 'B', ringkas: 'Berkas diunggah dalam format PDF.', url: '/faq' },
  ];
  const r = susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1', 'faq:2'], jawaban: 'Pendaftaran dilakukan secara online.' }), dua);
  assert.equal(r.status, 'answered');
  assert.equal(r.jawaban, 'Pendaftaran dilakukan secara online.', 'hanya kalimat terpilih yang dipakai');
  assert.ok(!r.jawaban.includes('PDF'), 'baris bukti lain tidak boleh ikut sebagai dump');
}
console.log('Task 3: evidence, klaim angka, status, dan proyeksi sumber OK');

// Parafrasa boleh, asal tidak menambah angka baru.
assert.equal(
  susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1'], jawaban: 'Pendaftaran dikerjakan lewat situs resmi UNJANI.' }), buktiFaq).status,
  'answered',
  'jawaban yang diringkas dengan kata sendiri harus diterima',
);
assert.equal(
  susunHasilChat(JSON.stringify({ status: 'answered', buktiIds: ['faq:1'], jawaban: 'Pendaftaran online, biayanya Rp75.000.' }), buktiFaq).status,
  'no_source',
  'parafrasa yang menyelipkan angka baru tetap ditolak',
);
console.log('Task 3: parafrasa tanpa angka karangan OK');

// Sapaan diganti balasan ramah, bukan penolakan; pertanyaan pendek tetap diproses.
for (const pesan of ['hai', 'Halo!', 'halo selamat pagi', 'terima kasih', 'p']) {
  assert.equal(adalahSapaan(pesan), true, `sapaan "${pesan}" harus dikenali`);
}
for (const pesan of ['apakah ada program studi kedokteran?', 'halo, berapa biaya TI?', 'hai, jadwal gelombang 5 kapan?', 'apa itu UNJANI']) {
  assert.equal(adalahSapaan(pesan), false, `"${pesan}" bukan sapaan murni`);
}
console.log('Task 3: deteksi sapaan OK');

// Riwayat: hanya user/assistant, dibatasi 12 pesan dan 4.000 karakter.
const riwayat = Array.from({ length: 20 }, (_, i) => ({ peran: i % 3 === 0 ? 'system' : i % 2 ? 'user' : 'assistant', isi: 'x'.repeat(500) }));
const dibatasi = batasiRiwayat(riwayat);
assert.ok(dibatasi.length <= 12, 'riwayat maksimal 12 pesan');
assert.ok(dibatasi.every(m => m.peran === 'user' || m.peran === 'assistant'), 'role selain user/assistant dibuang');
assert.ok(dibatasi.reduce((n, m) => n + m.isi.length, 0) <= 4000, 'total karakter riwayat dibatasi');
console.log('Task 3: pembatas riwayat OK');

console.log('check-chatbot: all assertions passed');
