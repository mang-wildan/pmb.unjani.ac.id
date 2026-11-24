import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout as tidur } from 'node:timers/promises';

const SKRIP = fileURLToPath(import.meta.url);
const BERKAS_DATA_BAWAAN = join(dirname(SKRIP), 'data', 'eval-chatbot.json');
const STATUS_SAH = new Set(['answered', 'clarification_needed', 'no_source', 'out_of_scope', 'temporarily_unavailable']);
const KATEGORI = [
  'biaya',
  'biaya-ambigu',
  'jadwal',
  'periode-lama',
  'syarat-prosedur',
  'kontradiksi',
  'gabungan',
  'typo-bahasa',
  'lanjutan',
  'injeksi',
  'luar-cakupan',
  'total-lulus',
];
const KUNCI_ITEM = new Set(['tanya', 'harusAdaSumber', 'kategori', 'catatan', 'riwayat']);
const KUNCI_RIWAYAT = new Set(['peran', 'isi']);
const BATAS_RESPONS = 256 * 1024;

const BANTUAN = `Evaluasi 50 pertanyaan chatbot PMB terhadap POST /api/chat.

Pemakaian:
  node scripts/eval-chatbot.mjs [opsi]

Opsi:
  --base-url <url>   Alamat server dev (default http://localhost:9532)
  --timeout <ms>     Batas waktu tiap permintaan (default 30000)
  --delay <ms>       Jeda antarpermintaan (default 4200, menjaga 15/menit)
  --slow             Jeda minimal 15000 ms bila limiter lebih ketat
  --dataset <path>   Berkas dataset lain (default scripts/data/eval-chatbot.json)
  --json             Ringkasan JSON saja di stdout
  --dry-run          Hanya validasi dataset, tanpa HTTP
  -h, --help         Tampilkan bantuan

Status keluar:
  0  semua butir lulus / dataset valid (dry-run)
  1  ada butir gagal, dataset tidak valid, atau run terhenti karena 429

Catatan:
  Run nyata memerlukan server dev yang berjalan (yarn dev) DAN key provider
  yang sudah dikonfigurasi operator di pengaturan chatbot. Tanpa itu server
  membalas 503 dan seluruh butir dihitung gagal. Skrip ini tidak mengubah DB,
  .env, dependensi, maupun konfigurasi auth, dan tidak mencetak body mentah
  secara utuh.
`;

const pesanSingkat = (nilai, batas = 160) =>
  String(nilai instanceof Error ? nilai.message : nilai ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, batas);

function bacaOpsi() {
  const { values } = parseArgs({
    options: {
      'base-url': { type: 'string', default: process.env.CHATBOT_EVAL_BASE_URL || 'http://localhost:9532' },
      timeout: { type: 'string', default: '30000' },
      delay: { type: 'string', default: '4200' },
      slow: { type: 'boolean', default: false },
      dataset: { type: 'string', default: BERKAS_DATA_BAWAAN },
      json: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
    strict: true,
  });

  const angka = (nama, nilai, minimum) => {
    const n = Number(nilai);
    if (!Number.isFinite(n) || n < minimum) throw new Error(`${nama} harus angka >= ${minimum}.`);
    return n;
  };

  let baseUrl;
  try {
    const url = new URL(values['base-url']);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
    baseUrl = url.toString().replace(/\/+$/, '');
  } catch {
    throw new Error('--base-url harus URL http/https yang valid.');
  }

  const delay = values.slow ? Math.max(angka('--delay', values.delay, 0), 15000) : angka('--delay', values.delay, 0);

  return {
    baseUrl,
    timeoutMs: angka('--timeout', values.timeout, 1),
    delayMs: delay,
    datasetPath: values.dataset,
    json: Boolean(values.json),
    dryRun: Boolean(values['dry-run']),
    help: Boolean(values.help),
  };
}

function bacaDataset(path) {
  let mentah;
  try {
    mentah = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(`Gagal membaca dataset ${path}: ${pesanSingkat(error)}`);
  }
  try {
    return JSON.parse(mentah);
  } catch (error) {
    throw new Error(`Dataset ${path} bukan JSON valid: ${pesanSingkat(error)}`);
  }
}

function validasiDataset(data) {
  const galat = [];
  if (!Array.isArray(data)) return ['Dataset harus berupa array JSON.'];
  if (data.length !== 50) galat.push(`Jumlah butir ${data.length}, harus tepat 50.`);

  const terlihat = new Map();
  data.forEach((item, i) => {
    const pos = `butir[${i}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      galat.push(`${pos}: bukan objek.`);
      return;
    }
    for (const kunci of Object.keys(item)) {
      if (!KUNCI_ITEM.has(kunci)) galat.push(`${pos}: field tidak dikenal "${kunci}".`);
    }
    if (typeof item.tanya !== 'string' || !item.tanya.trim()) {
      galat.push(`${pos}: tanya harus string tidak kosong.`);
    } else {
      if (item.tanya.length > 500) galat.push(`${pos}: tanya melebihi 500 karakter.`);
      const kunci = item.tanya.trim().toLowerCase();
      if (terlihat.has(kunci)) galat.push(`${pos}: pertanyaan duplikat dengan butir[${terlihat.get(kunci)}].`);
      else terlihat.set(kunci, i);
    }
    if (typeof item.harusAdaSumber !== 'boolean') galat.push(`${pos}: harusAdaSumber harus boolean.`);
    if (!KATEGORI.includes(item.kategori)) galat.push(`${pos}: kategori "${item.kategori}" tidak dikenal.`);
    if (typeof item.catatan !== 'string' || !item.catatan.trim()) galat.push(`${pos}: catatan harus string tidak kosong.`);
    if (item.riwayat !== undefined) {
      if (!Array.isArray(item.riwayat) || item.riwayat.length === 0 || item.riwayat.length > 20) {
        galat.push(`${pos}: riwayat harus array 1..20.`);
      } else {
        item.riwayat.forEach((m, j) => {
          if (!m || typeof m !== 'object' || Array.isArray(m)) {
            galat.push(`${pos}.riwayat[${j}]: bukan objek.`);
            return;
          }
          for (const kunci of Object.keys(m)) {
            if (!KUNCI_RIWAYAT.has(kunci)) galat.push(`${pos}.riwayat[${j}]: field tidak dikenal "${kunci}".`);
          }
          if (m.peran !== 'user' && m.peran !== 'assistant') galat.push(`${pos}.riwayat[${j}]: peran harus user|assistant.`);
          if (typeof m.isi !== 'string' || !m.isi.trim() || m.isi.length > 500) {
            galat.push(`${pos}.riwayat[${j}]: isi harus string 1..500.`);
          }
        });
      }
    }
  });

  if (data.length) {
    for (const kategori of KATEGORI) {
      if (!data.some((item) => item && item.kategori === kategori)) galat.push(`Kategori "${kategori}" tidak punya butir.`);
    }
  }
  return galat;
}

function validasiRespons(body) {
  const galat = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['respons bukan objek JSON.'];
  if (typeof body.jawaban !== 'string') galat.push('jawaban bukan string.');
  else if (!body.jawaban.trim()) galat.push('jawaban kosong.');
  if (!STATUS_SAH.has(body.status)) galat.push(`status tidak dikenal: ${pesanSingkat(body.status, 40) || '(kosong)'}.`);
  if (!Array.isArray(body.sumber)) galat.push('sumber bukan array.');
  else {
    body.sumber.forEach((sumber, i) => {
      const sah = sumber && typeof sumber === 'object' && !Array.isArray(sumber)
        && typeof sumber.judul === 'string' && sumber.judul.trim()
        && typeof sumber.url === 'string' && sumber.url.trim();
      if (!sah) galat.push(`sumber[${i}] harus {judul, url} string tidak kosong.`);
    });
  }
  if (typeof body.tawarkanWhatsApp !== 'boolean') galat.push('tawarkanWhatsApp bukan boolean.');
  return galat;
}

function statistikDataset(data) {
  const kategori = {};
  let bersumber = 0;
  for (const item of data) {
    kategori[item.kategori] = (kategori[item.kategori] || 0) + 1;
    if (item.harusAdaSumber) bersumber++;
  }
  return { total: data.length, unik: new Set(data.map((item) => item.tanya.trim().toLowerCase())).size, bersumber, kategori };
}

function persentil(nilai, p) {
  if (!nilai.length) return 0;
  const urut = [...nilai].sort((a, b) => a - b);
  return urut[Math.min(urut.length - 1, Math.max(0, Math.ceil(p * urut.length) - 1))];
}

async function kirimChat(baseUrl, item, timeoutMs) {
  const mulai = performance.now();
  const body = { pesan: item.tanya };
  if (item.riwayat) body.riwayat = item.riwayat;
  let respons;
  try {
    respons = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { latensiMs: Math.round(performance.now() - mulai), galatJaringan: pesanSingkat(error) };
  }
  let teks;
  try {
    const reader = respons.body?.getReader();
    const potongan = [];
    let ukuran = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        ukuran += value.byteLength;
        if (ukuran > BATAS_RESPONS) {
          await reader.cancel();
          return { http: respons.status, terlaluBesar: true, latensiMs: Math.round(performance.now() - mulai) };
        }
        potongan.push(value);
      }
    }
    teks = Buffer.concat(potongan).toString('utf8');
  } catch {
    return { http: respons.status, latensiMs: Math.round(performance.now() - mulai), galatJaringan: 'gagal membaca respons atau timeout' };
  }
  return { http: respons.status, teks, latensiMs: Math.round(performance.now() - mulai) };
}

function ringkasKegagalan(hasil, data) {
  return hasil
    .filter((h) => h.galat.length)
    .map((h) => ({
      indeks: h.indeks,
      kategori: h.kategori,
      tanya: pesanSingkat(data[h.indeks - 1]?.tanya, 120),
      status: h.status,
      jumlahSumber: h.jumlahSumber,
      alasan: h.galat.join('; '),
    }));
}

function susunRingkasan(hasil, data, opsi, rateLimited) {
  const latensi = hasil.map((h) => h.latensiMs).filter((n) => Number.isFinite(n));
  const status = {};
  let totalSumber = 0;
  let answeredTanpaSumber = 0;
  for (const h of hasil) {
    if (h.status) {
      status[h.status] = (status[h.status] || 0) + 1;
      totalSumber += h.jumlahSumber;
      if (h.status === 'answered' && h.jumlahSumber === 0) answeredTanpaSumber++;
    }
  }
  const kategori = {};
  for (const h of hasil) {
    if (!kategori[h.kategori]) kategori[h.kategori] = { total: 0, lulus: 0, gagal: 0 };
    kategori[h.kategori].total++;
    if (h.galat.length) kategori[h.kategori].gagal++;
    else kategori[h.kategori].lulus++;
  }
  const gagal = hasil.filter((h) => h.galat.length).length;
  const petunjuk = [];
  if (rateLimited) petunjuk.push('Rate limit 429 tercapai; jalankan ulang dengan --delay 5000 atau --slow.');
  if (hasil.some((h) => h.galat.some((g) => g.includes('HTTP 503')))) {
    petunjuk.push('HTTP 503 biasanya berarti chatbot nonaktif atau key provider belum diisi operator.');
  }

  return {
    mode: 'live',
    baseUrl: opsi.baseUrl,
    total: data.length,
    diproses: hasil.length,
    lulus: hasil.length - gagal,
    gagal,
    dilewati: data.length - hasil.length,
    rateLimited,
    status,
    sumber: {
      total: totalSumber,
      rataRata: hasil.length ? Number((totalSumber / hasil.length).toFixed(2)) : 0,
      maks: hasil.reduce((n, h) => Math.max(n, h.jumlahSumber), 0),
      answeredTanpaSumber,
    },
    latensiMs: {
      rataRata: latensi.length ? Math.round(latensi.reduce((a, b) => a + b, 0) / latensi.length) : 0,
      p50: persentil(latensi, 0.5),
      p95: persentil(latensi, 0.95),
      maks: latensi.length ? Math.max(...latensi) : 0,
    },
    kategori,
    kegagalan: ringkasKegagalan(hasil, data),
    petunjuk,
    catatan: 'Run nyata memerlukan server dev berjalan dan key provider yang dikonfigurasi operator; skrip tidak mengubah data.',
  };
}

function cetakRingkasan(ringkasan) {
  console.log('\nRingkasan');
  console.log(`  lulus ${ringkasan.lulus}/${ringkasan.total}, gagal ${ringkasan.gagal}, dilewati ${ringkasan.dilewati}`);
  console.log(`  status: ${Object.entries(ringkasan.status).map(([k, v]) => `${k}=${v}`).join(', ') || '(tidak ada)'}`);
  console.log(`  sumber: total ${ringkasan.sumber.total}, rata-rata ${ringkasan.sumber.rataRata}, maks ${ringkasan.sumber.maks}, answered tanpa sumber ${ringkasan.sumber.answeredTanpaSumber}`);
  console.log(`  latensi: rata-rata ${ringkasan.latensiMs.rataRata} ms, p50 ${ringkasan.latensiMs.p50} ms, p95 ${ringkasan.latensiMs.p95} ms, maks ${ringkasan.latensiMs.maks} ms`);
  console.log('\nKategori');
  for (const kategori of KATEGORI) {
    const s = ringkasan.kategori[kategori];
    if (s) console.log(`  ${kategori.padEnd(16)} ${s.lulus}/${s.total} lulus`);
  }
  if (ringkasan.kegagalan.length) {
    console.log('\nGagal');
    for (const g of ringkasan.kegagalan) {
      console.log(`  #${g.indeks} [${g.kategori}] ${g.alasan}${g.tanya ? ` — "${g.tanya}"` : ''}`);
    }
  } else if (!ringkasan.dilewati) {
    console.log('\nSemua butir lulus.');
  }
  for (const p of ringkasan.petunjuk) console.log(`\nPetunjuk: ${p}`);
  console.log(`\nCatatan: ${ringkasan.catatan}`);
}

async function main() {
  const opsi = bacaOpsi();
  if (opsi.help) {
    console.log(BANTUAN);
    return;
  }

  const data = bacaDataset(opsi.datasetPath);
  const galatDataset = validasiDataset(data);
  if (galatDataset.length) {
    if (opsi.json && opsi.dryRun) {
      console.log(JSON.stringify({ mode: 'dry-run', valid: false, galat: galatDataset }, null, 2));
    } else {
      console.error('[eval-chatbot] Dataset tidak valid:');
      for (const g of galatDataset) console.error(`  - ${g}`);
    }
    process.exitCode = 1;
    return;
  }

  const stat = statistikDataset(data);
  if (opsi.dryRun) {
    if (opsi.json) {
      console.log(JSON.stringify({ mode: 'dry-run', valid: true, ...stat }, null, 2));
      return;
    }
    console.log(`[eval-chatbot] Dataset valid: ${stat.total} butir, ${stat.unik} pertanyaan unik, ${KATEGORI.length} kategori.`);
    console.log(`  harusAdaSumber true=${stat.bersumber}, false=${stat.total - stat.bersumber}`);
    for (const kategori of KATEGORI) console.log(`  ${kategori.padEnd(16)} ${stat.kategori[kategori] || 0}`);
    console.log('\nDry-run tidak mengirim HTTP.');
    console.log('Catatan: run nyata memerlukan server dev yang berjalan dan key provider yang dikonfigurasi operator.');
    return;
  }

  if (!opsi.json) {
    console.log(`[eval-chatbot] ${data.length} butir -> ${opsi.baseUrl} (timeout ${opsi.timeoutMs} ms, jeda ${opsi.delayMs} ms)`);
    console.log('[eval-chatbot] /api/chat dibatasi 15 permintaan/menit; default jeda menjaga laju. Gunakan --slow bila muncul 429.');
  }

  const hasil = [];
  let rateLimited = false;
  for (let i = 0; i < data.length; i++) {
    if (i > 0 && opsi.delayMs > 0) await tidur(opsi.delayMs);
    const item = data[i];
    const keluaran = await kirimChat(opsi.baseUrl, item, opsi.timeoutMs);
    const catat = {
      indeks: i + 1,
      kategori: item.kategori,
      status: null,
      jumlahSumber: 0,
      latensiMs: keluaran.latensiMs,
      galat: [],
    };

    if (keluaran.galatJaringan) {
      catat.galat.push(`jaringan/timeout: ${keluaran.galatJaringan}`);
    } else if (keluaran.http === 429) {
      catat.galat.push('HTTP 429: rate limit /api/chat (15/menit)');
      hasil.push(catat);
      rateLimited = true;
      break;
    } else if (keluaran.http < 200 || keluaran.http >= 300) {
      catat.galat.push(`HTTP ${keluaran.http}${keluaran.teks ? `: ${pesanSingkat(keluaran.teks)}` : ''}`);
    } else if (keluaran.terlaluBesar) {
      catat.galat.push('respons melebihi 256 KB.');
    } else if (!keluaran.teks || !keluaran.teks.trim()) {
      catat.galat.push('body respons kosong.');
    } else {
      let body;
      try {
        body = JSON.parse(keluaran.teks);
      } catch {
        catat.galat.push(`respons bukan JSON valid: ${pesanSingkat(keluaran.teks)}`);
      }
      if (!catat.galat.length) {
        const galatBentuk = validasiRespons(body);
        if (galatBentuk.length) {
          catat.galat.push(...galatBentuk);
        } else {
          catat.status = body.status;
          catat.jumlahSumber = body.sumber.length;
          if (body.status === 'answered' && body.sumber.length === 0) {
            catat.galat.push('status answered tetapi sumber kosong.');
          }
          if (item.harusAdaSumber) {
            if (body.status !== 'answered' || body.sumber.length === 0) {
              catat.galat.push(`ekspektasi bersumber tidak terpenuhi (status ${body.status}, sumber ${body.sumber.length}).`);
            }
          } else if (body.status === 'answered' && body.sumber.length > 0) {
            catat.galat.push(`seharusnya tidak dijawab bersumber (status answered, sumber ${body.sumber.length}).`);
          }
        }
      }
    }

    hasil.push(catat);
    if (!opsi.json) {
      const status = catat.galat.length ? 'GAGAL' : 'OK';
      const info = catat.galat.length ? catat.galat.join('; ') : `sumber ${catat.jumlahSumber}`;
      console.log(`[${String(catat.indeks).padStart(2, '0')}/${data.length}] ${catat.kategori.padEnd(16)} ${String(catat.status ?? '-').padEnd(23)} ${String(catat.latensiMs).padStart(6)} ms  ${status}  ${info}`);
    }
  }

  const ringkasan = susunRingkasan(hasil, data, opsi, rateLimited);
  if (opsi.json) console.log(JSON.stringify(ringkasan, null, 2));
  else cetakRingkasan(ringkasan);
  if (ringkasan.gagal || ringkasan.dilewati || ringkasan.rateLimited) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[eval-chatbot] ${pesanSingkat(error, 300)}`);
  process.exitCode = 1;
});
