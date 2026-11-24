// Jalankan: node scripts/check-chatbot-settings.mjs
// Uji perilaku enkripsi chatbot & redaksi rahasia (bukan sekadar regex sumber).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Jalankan ulang lewat loader tsx agar bisa mengimpor helper TypeScript.
if (!process.env.__CHATBOT_SETTINGS_CHECK_TS) {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('tsx');
  const hasil = spawnSync(process.execPath, ['--import', pathToFileURL(loader).href, fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, __CHATBOT_SETTINGS_CHECK_TS: '1' },
  });
  process.exit(hasil.status ?? 1);
}

const { enkripsiChatbotSecret, dekripsiChatbotSecret, ChatbotEncryptionConfigError, ChatbotDecryptionError } =
  await import('../src/lib/chatbotSecret.ts');
const { redaksiLog } = await import('../src/models/AuditLog.ts');
const { CHATBOT_DEFAULT, chatbotUntukAdmin, chatbotUntukAudit, chatbotUntukPublik, modelUntukProvider } =
  await import('../src/models/Settings.ts');

const KUNCI_VALID = 'ab'.repeat(32); // 32 byte hex
const rahasia = 'sk-live-rahasia-12345';
const pesanGalatKripto = [];

function galatCrypto(fn, label) {
  try {
    fn();
  } catch (e) {
    pesanGalatKripto.push(String(e.message));
    return e;
  }
  assert.fail(`${label}: seharusnya melempar error`);
}

// 1. Tanpa kunci: gagal tertutup, error generik, tidak bocor rahasia.
delete process.env.CHATBOT_ENCRYPTION_KEY;
assert.ok(
  galatCrypto(() => enkripsiChatbotSecret(rahasia), 'tanpa kunci') instanceof ChatbotEncryptionConfigError,
  'tanpa kunci harus menolak dengan error generik',
);

// 2. Kunci tidak valid (panjang salah / bukan hex): gagal tertutup.
for (const buruk of ['pendek', 'z'.repeat(64)]) {
  process.env.CHATBOT_ENCRYPTION_KEY = buruk;
  assert.ok(
    galatCrypto(() => enkripsiChatbotSecret(rahasia), `kunci ${buruk.slice(0, 6)}`) instanceof
      ChatbotEncryptionConfigError,
    `kunci "${buruk.slice(0, 6)}…" harus ditolak`,
  );
}

// 3. Round-trip & IV acak.
process.env.CHATBOT_ENCRYPTION_KEY = KUNCI_VALID;
const a = enkripsiChatbotSecret(rahasia);
const b = enkripsiChatbotSecret(rahasia);
assert.ok(a.startsWith('v1:'), 'format harus berawalan v1:');
assert.notEqual(a, b, 'IV acak: dua enkripsi teks sama harus berbeda');
assert.ok(!a.includes(rahasia), 'ciphertext tidak boleh memuat plaintext');
assert.equal(dekripsiChatbotSecret(a), rahasia, 'round-trip harus sama');

// 4. Ciphertext diubah (tamper): dekripsi gagal, tanpa membocorkan rahasia.
const bagian = a.split(':');
const tagRusak = bagian.slice();
const tagBytes = Buffer.from(tagRusak[2], 'base64url');
tagBytes[0] ^= 1;
tagRusak[2] = tagBytes.toString('base64url');
assert.ok(
  galatCrypto(() => dekripsiChatbotSecret(tagRusak.join(':')), 'tamper tag') instanceof
    ChatbotDecryptionError,
  'tamper tag auth harus menolak dengan error generik',
);

// 5. Konfigurasi hilang/tidak valid juga menolak pembacaan ciphertext.
for (const buruk of [undefined, 'invalid']) {
  if (buruk === undefined) delete process.env.CHATBOT_ENCRYPTION_KEY;
  else process.env.CHATBOT_ENCRYPTION_KEY = buruk;
  assert.ok(
    galatCrypto(() => dekripsiChatbotSecret(a), 'konfigurasi baca') instanceof
      ChatbotEncryptionConfigError,
  );
}

// Kunci salah: dekripsi gagal.
process.env.CHATBOT_ENCRYPTION_KEY = 'cd'.repeat(32);
assert.ok(
  galatCrypto(() => dekripsiChatbotSecret(a), 'kunci salah') instanceof ChatbotDecryptionError,
  'kunci berbeda harus menolak dekripsi',
);

// Semua pesan galat kripto wajib generik: tanpa plaintext, ciphertext, atau kunci.
assert.ok(pesanGalatKripto.length >= 6, 'semua jalur galat kripto teruji');
for (const pesan of pesanGalatKripto) {
  assert.ok(!pesan.includes(rahasia), 'pesan galat tidak boleh memuat plaintext');
  assert.ok(!pesan.includes(a) && !pesan.includes(KUNCI_VALID), 'pesan galat tidak boleh memuat ciphertext/kunci');
}

// 6. Serializer admin/audit/publik tidak pernah memuat key (plaintext maupun ciphertext).
process.env.CHATBOT_ENCRYPTION_KEY = KUNCI_VALID;
const tersimpan = enkripsiChatbotSecret(rahasia);
const chatbot = {
  aktif: true,
  provider: 'openrouter',
  modelOpenRouter: 'google/gemini-2.0-flash-001',
  modelDeepSeek: 'deepseek-chat',
  modelGemini: 'gemini-2.0-flash',
  apiKeyOpenRouter: tersimpan,
  apiKeyDeepSeek: '',
  apiKeyGemini: tersimpan,
  ambangPuasTanya: 4,
  pesanPembuka: 'Halo',
};
const klien = chatbotUntukAdmin(chatbot);
assert.equal(klien.apiKeyOpenRouterTerisi, true, 'status terisi openrouter');
assert.equal(klien.apiKeyGeminiTerisi, true, 'status terisi gemini');
assert.equal(klien.apiKeyDeepSeekTerisi, false, 'status kosong deepseek');
assert.ok(!('apiKeyOpenRouter' in klien), 'klien tidak boleh memuat field apiKeyOpenRouter');
assert.ok(!JSON.stringify(klien).includes(rahasia), 'klien tidak boleh memuat plaintext');
assert.ok(!JSON.stringify(klien).includes(tersimpan), 'klien tidak boleh memuat ciphertext');

const audit = chatbotUntukAudit(chatbot);
assert.equal(audit.apiKeyOpenRouter, '[tersimpan]', 'audit ganti openrouter');
assert.equal(audit.apiKeyGemini, '[tersimpan]', 'audit ganti gemini');
assert.equal(audit.apiKeyDeepSeek, '', 'audit biarkan key kosong');
assert.ok(!JSON.stringify(audit).includes(tersimpan), 'audit tidak boleh memuat ciphertext');

const publik = chatbotUntukPublik(chatbot);
assert.deepEqual(publik, { aktif: true, pesanPembuka: 'Halo', ambangPuasTanya: 4 });
assert.ok(!('apiKeyOpenRouter' in publik), 'publik tanpa kunci');

// 6b. Subdok parsial (mis. hasil $set dotted pertama) tetap memakai default skema.
const parsial = chatbotUntukAdmin({ aktif: true });
assert.equal(parsial.modelOpenRouter, CHATBOT_DEFAULT.modelOpenRouter, 'default model openrouter');
assert.equal(parsial.modelDeepSeek, CHATBOT_DEFAULT.modelDeepSeek, 'default model deepseek');
assert.equal(parsial.modelGemini, CHATBOT_DEFAULT.modelGemini, 'default model gemini');
assert.equal(parsial.pesanPembuka, CHATBOT_DEFAULT.pesanPembuka, 'default greeting');
assert.equal(parsial.ambangPuasTanya, CHATBOT_DEFAULT.ambangPuasTanya, 'default ambang');
assert.equal(chatbotUntukPublik({ aktif: true }).pesanPembuka, CHATBOT_DEFAULT.pesanPembuka);
assert.equal(chatbotUntukAudit({ aktif: true }).pesanPembuka, CHATBOT_DEFAULT.pesanPembuka);
assert.equal(modelUntukProvider({}, 'gemini'), CHATBOT_DEFAULT.modelGemini);
assert.equal(
  chatbotUntukAdmin({ modelOpenRouter: '' }).modelOpenRouter,
  '',
  'nilai kosong eksplisit tidak boleh diganti default',
);

// 7. redaksiLog (lapisan kedua audit) menyamarkan kredensial tersarang.
const hasilRedaksi = redaksiLog({
  chatbot: { apiKeyOpenRouter: 'sk-live', apiKeyDeepSeek: '', apiKeyGemini: 'AIza-secret' },
  instagramAccessToken: 'abc',
  recaptcha: { secretKey: 'x' },
  aktif: true,
});
assert.equal(hasilRedaksi.chatbot.apiKeyOpenRouter, '[disamarkan]');
assert.equal(hasilRedaksi.chatbot.apiKeyDeepSeek, '');
assert.equal(hasilRedaksi.chatbot.apiKeyGemini, '[disamarkan]');
assert.equal(hasilRedaksi.aktif, true, 'boolean bukan kredensial dibiarkan');
assert.ok(!JSON.stringify(hasilRedaksi).includes('sk-live'), 'redaksiLog tanpa plaintext');

console.log('check-chatbot-settings: all behavioral assertions passed');
