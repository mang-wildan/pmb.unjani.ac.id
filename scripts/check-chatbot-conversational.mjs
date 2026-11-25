import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Loader tsx agar impor TypeScript bekerja.
if (!process.env.__CHATBOT_CONV_CHECK_TS) {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('tsx');
  const hasil = spawnSync(process.execPath, ['--import', pathToFileURL(loader).href, fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, __CHATBOT_CONV_CHECK_TS: '1' },
  });
  process.exit(hasil.status ?? 1);
}

const { PROMPT_CHATBOT } = await import('../src/lib/chatbot/prompt.ts');
const { susunHasilChat } = await import('../src/lib/chatbot/hasil.ts');

// 1. System prompt memuat identitas ramah, pengetahuan statis, dan izin menjawab sapaan tanpa tool.
assert.match(PROMPT_CHATBOT, /ramah dan membantu/i, 'persona ramah');
assert.match(PROMPT_CHATBOT, /Cimahi/i, 'lokasi Cimahi tercantum di prompt');
assert.match(PROMPT_CHATBOT, /Kedokteran/i, 'fakultas tercantum di prompt');
assert.match(PROMPT_CHATBOT, /tanpa buktiIds/i, 'izin menjawab sapaan tanpa buktiIds');
console.log('1. Prompt persona & pengetahuan statis OK');

// 2. Berbagai variasi sapaan dan basa-basi santai dijawab ramah (status answered, sumber kosong).
const variasiSapaan = [
  'Halo! Saya asisten PMB UNJANI. Ada yang bisa saya bantu?',
  'Selamat pagi! Silakan jika ada yang ingin ditanyakan seputar pendaftaran di UNJANI.',
  'Halo kak! Tentu, silakan tanyakan seputar prodi, jalur, atau biaya pendaftaran.',
  'Sama-sama! Semoga sukses proses pendaftarannya di UNJANI ya.',
];
for (const balasan of variasiSapaan) {
  const r = susunHasilChat(JSON.stringify({ status: 'answered', jawaban: balasan }), []);
  assert.equal(r.status, 'answered', `sapaan "${balasan}" harus dijawab answered`);
  assert.deepEqual(r.sumber, [], 'sumber sapaan harus kosong');
  assert.equal(r.tawarkanWhatsApp, false);
}
console.log('2. Variasi sapaan santai OK');

// 3. Pertanyaan umum tentang kampus dijawab tanpa tool, asalkan tanpa angka fakta.
const tanyaUmum = [
  'Kampus utama UNJANI berlokasi di Cimahi, dengan kampus lain di Bandung.',
  'UNJANI memiliki Fakultas Kedokteran, Farmasi, Teknik, dan lainnya.',
  'Pendaftaran PMB UNJANI dilakukan secara online melalui situs resmi pmb.unjani.ac.id.',
  'UNJANI membuka jenjang S1, D3, dan Profesi.',
];
for (const balasan of tanyaUmum) {
  const r = susunHasilChat(JSON.stringify({ status: 'answered', jawaban: balasan }), []);
  assert.equal(r.status, 'answered', `tanya umum "${balasan}" harus dijawab answered`);
  assert.deepEqual(r.sumber, []);
}
console.log('3. Pertanyaan umum profil kampus OK');

// 4. Klarifikasi kontekstual buatan model digunakan secara fleksibel.
const klarifikasiLuwes = [
  'Boleh tahu jenjang yang kakak minati, apakah S1, D3, atau Profesi?',
  'Untuk informasi biaya, prodi mana yang ingin kakak ketahui?',
  'Mau mendaftar lewat jalur apa kak, jalur Prestasi atau Rapor?',
];
for (const kl of klarifikasiLuwes) {
  const r = susunHasilChat(JSON.stringify({ status: 'clarification_needed', jawaban: kl }), []);
  assert.equal(r.status, 'clarification_needed');
  assert.equal(r.jawaban, kl, `klarifikasi "${kl}" harus dipakai utuh`);
}
console.log('4. Klarifikasi kontekstual buatan model OK');

// 5. Anti-halusinasi: klaim biaya/tanggal/masa studi/kuota TANPA BUKTI tetap ditolak (no_source).
const halusinasi = [
  'Biaya kuliah kedokteran sekitar Rp5.000.000 per semester.',
  'Pendaftaran gelombang satu dibuka 1 Januari 2027.',
  'Total biaya sampai lulus sekitar Rp45.000.000.',
  'Masa studi untuk S1 adalah 4 tahun.',
  'Biaya pendaftaran sebesar Rp250.000.',
];
for (const palsu of halusinasi) {
  const r = susunHasilChat(JSON.stringify({ status: 'answered', jawaban: palsu }), []);
  assert.equal(r.status, 'no_source', `halusinasi "${palsu}" wajib ditolak no_source`);
  assert.equal(r.tawarkanWhatsApp, true);
}
console.log('5. Anti-halusinasi klaim biaya & tanggal OK');

// 6. Fakta resmi DENGAN BUKTI tetap diterima dan sumbernya terproyeksi.
const buktiResmi = [
  { id: 'prodi:p1', judul: 'Pendidikan Dokter S-1', ringkas: 'Pendidikan Dokter S-1 (PD). Akreditasi: Unggul.', url: '/#program-studi' },
  { id: 'biaya:b1', judul: 'Biaya Kedokteran', ringkas: 'Biaya pokok: Rp150.000.000. Estimasi biaya per semester: Rp15.000.000.', url: '/#kalkulator' },
];
const rResmi = susunHasilChat(JSON.stringify({
  status: 'answered',
  buktiIds: ['prodi:p1', 'biaya:b1'],
  jawaban: 'UNJANI memiliki program studi Pendidikan Dokter S-1 dengan akreditasi Unggul. Biaya pokok: Rp150.000.000.',
}), buktiResmi);
assert.equal(rResmi.status, 'answered');
assert.equal(rResmi.sumber.length, 2);
console.log('6. Jawaban berbasis bukti resmi OK');

console.log('check-chatbot-conversational: all assertions passed');
