/* eslint-disable no-console */
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
// Load .env (base), then .env.local overrides it — same as Next.js convention
const cwd = process.cwd();
for (const f of ['.env', '.env.local']) {
  const p = path.join(cwd, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
}
import mongoose from 'mongoose';
import { AdminUser } from '../src/models/AdminUser';
import { Fakultas } from '../src/models/Fakultas';
import { ProgramStudi } from '../src/models/ProgramStudi';
import { Kelas } from '../src/models/Kelas';
import { JalurSeleksi } from '../src/models/JalurSeleksi';
import { Jadwal } from '../src/models/Jadwal';
import { Biaya } from '../src/models/Biaya';
import { FAQ } from '../src/models/FAQ';
import { Pengumuman } from '../src/models/Pengumuman';
import { Settings } from '../src/models/Settings';
import { PageContent } from '../src/models/PageContent';
import { validatePassword } from '../src/lib/passwordPolicy';

// Password bawaan lama yang pernah tertulis di repo; tidak boleh dipakai lagi.
const PASSWORD_BAWAAN_LAMA = 'Pmb!Unjani2026';
const PASSWORD_MIN = 12;

function ambilPasswordAdmin(): string {
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? '';
  if (!password) {
    console.error(
      'DEFAULT_ADMIN_PASSWORD tidak diatur. Isi di .env.local (min. 12 karakter, tanpa nilai bawaan), lalu jalankan ulang.',
    );
    process.exit(1);
  }
  if (password === PASSWORD_BAWAAN_LAMA) {
    console.error('DEFAULT_ADMIN_PASSWORD memakai password bawaan lama yang sudah publik. Pilih password lain.');
    process.exit(1);
  }
  if (password.length < PASSWORD_MIN) {
    console.error(`DEFAULT_ADMIN_PASSWORD terlalu pendek (min. ${PASSWORD_MIN} karakter).`);
    process.exit(1);
  }
  const pesan = validatePassword(password);
  if (pesan) {
    console.error(`DEFAULT_ADMIN_PASSWORD ditolak kebijakan password: ${pesan}`);
    process.exit(1);
  }
  return password;
}

async function main() {
  // Dicek sebelum koneksi DB: tanpa password valid, seed tidak menyentuh database sama sekali.
  const password = ambilPasswordAdmin();
  if (!process.env.MONGO_URI && !process.env.MONGO_DIRECT_URI) {
    console.error(
      'MONGO_URI atau MONGO_DIRECT_URI tidak diatur. Buat .env.local dari .env.example dulu.',
    );
    process.exit(1);
  }
  const { connectDb } = await import('../src/lib/db');
  await connectDb();
  console.log('[seed] terhubung ke MongoDB');

  // ─── Admin ───────────────────────────────────────────────────────────────
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@unjani.ac.id').toLowerCase();
  const existing = await AdminUser.findOne({ email });
  if (!existing) {
    const hash = await AdminUser.hashPassword(password);
    await AdminUser.create({
      email,
      passwordHash: hash,
      nama: 'Super Admin PMB',
      role: 'superadmin',
      aktif: true,
    });
    console.log(`[seed] superadmin dibuat: ${email} (password sesuai DEFAULT_ADMIN_PASSWORD; segera ganti setelah login)`);
  } else {
    console.log(`[seed] superadmin sudah ada: ${email}`);
  }

  // ─── Settings (singleton) ─────────────────────────────────────────────────
  const s = await Settings.findOne({ singleton: 'main' });
  if (!s) {
    await Settings.create({
      singleton: 'main',
      siteName: 'PMB UNJANI',
      tagline: 'Gerbang Masa Depanmu di Universitas Jenderal Achmad Yani',
      urlPendaftaran:
        process.env.DEFAULT_URL_PENDAFTARAN || 'https://pendaftaran.unjani.ac.id/loginnew',
      alamat: 'Jl. Terusan Jenderal Sudirman, Cimahi 40531, Jawa Barat',
      email: 'pmb@unjani.ac.id',
      telepon: '(022) 6631564',
      defaultMetaTitle: 'PMB UNJANI — Penerimaan Mahasiswa Baru',
      defaultMetaDescription:
        'Informasi resmi Penerimaan Mahasiswa Baru Universitas Jenderal Achmad Yani. Jalur seleksi, jadwal, biaya, dan kalkulator PMB.',
    });
    console.log('[seed] Settings default dibuat');
  }

  // ─── Hero (PageContent) ───────────────────────────────────────────────────
  const hero = await PageContent.findOne({ kunci: 'hero' });
  if (!hero) {
    await PageContent.create({
      kunci: 'hero',
      data: {
        judul: '',
        subJudul: '',
        tahunAjaran: 'Tahun Akademik 2026/2027',
      },
    });
  }

  // ─── Jalur Seleksi ────────────────────────────────────────────────────────
  const jalurSeed = [
    {
      nama: 'Jalur Prestasi Akademik',
      slug: 'prestasi-akademik',
      badge: 'Favorit',
      ringkasan:
        'Jalur untuk siswa berprestasi akademik dengan nilai rapor unggul dan seleksi administrasi.',
      persyaratan: [
        'Lulusan SMA/SMK/MA/sederajat tahun 2024-2026',
        'Nilai rata-rata rapor semester 1-5 minimal 80',
        'Menyertakan sertifikat prestasi bila ada',
      ],
      urutan: 10,
    },
    {
      nama: 'Jalur Reguler',
      slug: 'reguler',
      ringkasan:
        'Seleksi tertulis reguler untuk semua calon mahasiswa baru tanpa persyaratan prestasi khusus.',
      persyaratan: [
        'Lulusan SMA/SMK/MA/sederajat',
        'Lulus tes seleksi akademik UNJANI',
        'Memenuhi persyaratan administrasi',
      ],
      urutan: 20,
    },
    {
      nama: 'Jalur Beasiswa',
      slug: 'beasiswa',
      badge: 'Baru',
      ringkasan:
        'Jalur khusus untuk calon mahasiswa berprestasi atau kurang mampu dengan skema beasiswa.',
      persyaratan: [
        'Memenuhi kriteria beasiswa yang berlaku',
        'Surat rekomendasi dari sekolah',
        'Bukti pendapatan orang tua (untuk beasiswa ekonomi)',
      ],
      urutan: 30,
    },
    {
      nama: 'Jalur Pindahan',
      slug: 'pindahan',
      ringkasan:
        'Jalur bagi mahasiswa yang ingin pindah dari perguruan tinggi lain ke UNJANI.',
      persyaratan: [
        'Transkrip nilai dari perguruan tinggi asal',
        'Surat keterangan pindah dari perguruan tinggi asal',
        'IPK minimal 2.75 dari perguruan tinggi asal',
      ],
      urutan: 40,
    },
  ];
  for (const j of jalurSeed) {
    await JalurSeleksi.updateOne(
      { slug: j.slug },
      { $setOnInsert: { ...j, aktif: true } },
      { upsert: true },
    );
  }
  console.log(`[seed] ${jalurSeed.length} jalur seleksi siap`);

  // ─── Jadwal ───────────────────────────────────────────────────────────────
  // Jalur harus sudah di-seed sebelumnya; load untuk dapat ObjectId-nya
  const jalurForJadwal = await JalurSeleksi.find().lean();
  const tahun = '2026/2027';
  const jalurSemua = jalurForJadwal.map((j) => j._id);

  type JadwalSeedItem = {
    judul: string;
    jalur: mongoose.Types.ObjectId[];
    mulai: Date;
    selesai: Date;
    tahun: string;
    status: boolean;
  };

  const jadwalSeed: JadwalSeedItem[] = [
    { tahun, judul: 'Pendaftaran Gelombang 1', jalur: jalurSemua, mulai: new Date('2026-02-01'), selesai: new Date('2026-04-30'), status: true },
    { tahun, judul: 'Pendaftaran Gelombang 2', jalur: jalurSemua, mulai: new Date('2026-05-01'), selesai: new Date('2026-06-30'), status: true },
    { tahun, judul: 'Pendaftaran Gelombang 3', jalur: jalurSemua, mulai: new Date('2026-07-01'), selesai: new Date('2026-08-31'), status: true },
    { tahun, judul: 'Pendaftaran Gelombang 4', jalur: jalurSemua, mulai: new Date('2026-09-01'), selesai: new Date('2026-10-31'), status: true },
    { tahun, judul: 'Pendaftaran Gelombang 5', jalur: jalurSemua, mulai: new Date('2026-11-01'), selesai: new Date('2027-01-31'), status: true },
  ];

  const judulPendaftaran = jadwalSeed.map((j) => j.judul);
  await Jadwal.deleteMany({
    tahun,
    judul: { $nin: judulPendaftaran },
  });

  for (const j of jadwalSeed) {
    await Jadwal.updateOne(
      { tahun: j.tahun, judul: j.judul },
      { $set: j },
      { upsert: true },
    );
  }
  console.log(`[seed] ${jadwalSeed.length} jadwal siap`);

  // ─── Fakultas ─────────────────────────────────────────────────────────────
  const fakultasSeed = [
    { nama: 'Fakultas Teknik', singkatan: 'FT' },
    { nama: 'Fakultas Ekonomi dan Bisnis', singkatan: 'FEB' },
    { nama: 'Fakultas Hukum', singkatan: 'FH' },
    { nama: 'Fakultas Ilmu Sosial dan Ilmu Politik', singkatan: 'FISIP' },
    { nama: 'Fakultas Psikologi', singkatan: 'FPSI' },
    { nama: 'Fakultas Kedokteran', singkatan: 'FK' },
    { nama: 'Fakultas Farmasi', singkatan: 'FF' },
    { nama: 'Pascasarjana', singkatan: 'PASCA' },
  ];
  for (const f of fakultasSeed) {
    await Fakultas.updateOne({ singkatan: f.singkatan }, { $setOnInsert: f }, { upsert: true });
  }
  console.log(`[seed] ${fakultasSeed.length} fakultas siap`);

  // Load semua fakultas untuk mapping
  const allFakultas = await Fakultas.find().lean();
  const fak = (singkatan: string) => {
    const found = allFakultas.find((f) => f.singkatan === singkatan);
    if (!found) throw new Error(`Fakultas "${singkatan}" tidak ditemukan`);
    return found._id;
  };

  // ─── Program Studi ────────────────────────────────────────────────────────
  const prodiSeed = [
    // Fakultas Teknik
    { nama: 'Teknik Informatika', singkatan: 'TI', jenjang: 'S1', fakultas: 'FT', akreditasi: 'B' },
    { nama: 'Teknik Industri', singkatan: 'TID', jenjang: 'S1', fakultas: 'FT', akreditasi: 'B' },
    { nama: 'Teknik Mesin', singkatan: 'TM', jenjang: 'S1', fakultas: 'FT', akreditasi: 'B' },
    { nama: 'Teknik Sipil', singkatan: 'TS', jenjang: 'S1', fakultas: 'FT', akreditasi: 'B' },
    { nama: 'Teknik Elektro', singkatan: 'TE', jenjang: 'S1', fakultas: 'FT', akreditasi: 'B' },
    { nama: 'Teknik Kimia', singkatan: 'TK', jenjang: 'S1', fakultas: 'FT', akreditasi: 'B' },
    // Fakultas Ekonomi dan Bisnis
    { nama: 'Manajemen', singkatan: 'MNJ', jenjang: 'S1', fakultas: 'FEB', akreditasi: 'B' },
    { nama: 'Akuntansi', singkatan: 'AKT', jenjang: 'S1', fakultas: 'FEB', akreditasi: 'B' },
    // Fakultas Hukum
    { nama: 'Ilmu Hukum', singkatan: 'IH', jenjang: 'S1', fakultas: 'FH', akreditasi: 'B' },
    // Fakultas ISIP
    { nama: 'Ilmu Administrasi Negara', singkatan: 'AN', jenjang: 'S1', fakultas: 'FISIP', akreditasi: 'B' },
    { nama: 'Ilmu Komunikasi', singkatan: 'IK', jenjang: 'S1', fakultas: 'FISIP', akreditasi: 'B' },
    // Fakultas Psikologi
    { nama: 'Psikologi', singkatan: 'PSI', jenjang: 'S1', fakultas: 'FPSI', akreditasi: 'B' },
    // Fakultas Kedokteran
    { nama: 'Pendidikan Dokter', singkatan: 'PD', jenjang: 'S1', fakultas: 'FK', akreditasi: 'B' },
    { nama: 'Profesi Dokter', singkatan: 'PROFDOK', jenjang: 'Profesi', fakultas: 'FK', akreditasi: 'B' },
    // Fakultas Farmasi
    { nama: 'Farmasi', singkatan: 'FARM', jenjang: 'S1', fakultas: 'FF', akreditasi: 'B' },
    { nama: 'Profesi Apoteker', singkatan: 'APOT', jenjang: 'Profesi', fakultas: 'FF', akreditasi: 'B' },
    // Pascasarjana
    { nama: 'Magister Manajemen', singkatan: 'MM', jenjang: 'S2', fakultas: 'PASCA', akreditasi: 'B' },
    { nama: 'Magister Hukum', singkatan: 'MH', jenjang: 'S2', fakultas: 'PASCA', akreditasi: 'B' },
  ];
  for (const p of prodiSeed) {
    await ProgramStudi.updateOne(
      { singkatan: p.singkatan },
      {
        $setOnInsert: {
          nama: p.nama,
          singkatan: p.singkatan,
          jenjang: p.jenjang,
          fakultas_id: fak(p.fakultas),
          akreditasi: p.akreditasi,
        },
      },
      { upsert: true },
    );
  }
  console.log(`[seed] ${prodiSeed.length} program studi siap`);

  // ─── Kelas ────────────────────────────────────────────────────────────────
  const kelasSeed = [
    { nama: 'Reguler Pagi', singkatan: 'RP' },
    { nama: 'Reguler Sore', singkatan: 'RS' },
    { nama: 'Kelas Karyawan', singkatan: 'KK' },
    { nama: 'Internasional', singkatan: 'INT' },
  ];
  for (const k of kelasSeed) {
    await Kelas.updateOne({ singkatan: k.singkatan }, { $setOnInsert: k }, { upsert: true });
  }
  console.log(`[seed] ${kelasSeed.length} kelas siap`);

  // ─── Biaya ────────────────────────────────────────────────────────────────
  // Load referensi untuk biaya
  const [allProdi, allJalur, allKelas, allJadwal] = await Promise.all([
    ProgramStudi.find().lean(),
    JalurSeleksi.find().lean(),
    Kelas.find().lean(),
    Jadwal.find().lean(),
  ]);

  const prodiId = (singkatan: string) => {
    const found = allProdi.find((p) => p.singkatan === singkatan);
    if (!found) throw new Error(`Program studi "${singkatan}" tidak ditemukan`);
    return found._id;
  };
  const jalurId = (nama: string) => {
    const found = allJalur.find((j) => j.nama === nama);
    if (!found) throw new Error(`Jalur "${nama}" tidak ditemukan`);
    return found._id;
  };
  const kelasId = (singkatan: string) => {
    const found = allKelas.find((k) => k.singkatan === singkatan);
    if (!found) throw new Error(`Kelas "${singkatan}" tidak ditemukan`);
    return found._id;
  };
  const jadwalId = (judul: string, tahunJadwal: string) => {
    const found = allJadwal.find((j) => j.judul === judul && j.tahun === tahunJadwal);
    if (!found) throw new Error(`Jadwal "${judul}" (${tahunJadwal}) tidak ditemukan`);
    return found._id;
  };

  type BayaSeedItem = {
    programStudi_id: mongoose.Types.ObjectId;
    jalur_id: mongoose.Types.ObjectId;
    jadwal_id: mongoose.Types.ObjectId;
    kelas_id?: mongoose.Types.ObjectId;
    biaya: number;
    biayaTambahan?: number;
    minBiayaTambahan?: number;
  };

  const biayaSeedBase: Omit<BayaSeedItem, 'jadwal_id'>[] = [
    // Teknik Informatika
    { programStudi_id: prodiId('TI'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 5_500_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TI'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RS'), biaya: 6_000_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TI'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 4_500_000, biayaTambahan: 400_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TI'), jalur_id: jalurId('Jalur Beasiswa'), kelas_id: kelasId('RP'), biaya: 2_500_000 },
    // Teknik Industri
    { programStudi_id: prodiId('TID'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 5_000_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TID'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RS'), biaya: 5_500_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TID'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 4_000_000 },
    // Teknik Mesin
    { programStudi_id: prodiId('TM'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 4_800_000, biayaTambahan: 450_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TM'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 3_800_000 },
    // Teknik Sipil
    { programStudi_id: prodiId('TS'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 5_000_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('TS'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 4_000_000 },
    // Teknik Elektro
    { programStudi_id: prodiId('TE'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 5_000_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    // Manajemen
    { programStudi_id: prodiId('MNJ'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 4_500_000, biayaTambahan: 400_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('MNJ'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RS'), biaya: 5_000_000, biayaTambahan: 400_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('MNJ'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('KK'), biaya: 5_500_000, biayaTambahan: 400_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('MNJ'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 3_500_000 },
    { programStudi_id: prodiId('MNJ'), jalur_id: jalurId('Jalur Beasiswa'), kelas_id: kelasId('RP'), biaya: 2_000_000 },
    // Akuntansi
    { programStudi_id: prodiId('AKT'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 4_500_000, biayaTambahan: 400_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('AKT'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RS'), biaya: 5_000_000, biayaTambahan: 400_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('AKT'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 3_500_000 },
    // Ilmu Hukum
    { programStudi_id: prodiId('IH'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 4_000_000, biayaTambahan: 350_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('IH'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RS'), biaya: 4_500_000, biayaTambahan: 350_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('IH'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 3_000_000 },
    // Ilmu Administrasi Negara
    { programStudi_id: prodiId('AN'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 4_000_000, biayaTambahan: 350_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('AN'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 3_000_000 },
    // Ilmu Komunikasi
    { programStudi_id: prodiId('IK'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 4_200_000, biayaTambahan: 350_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('IK'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 3_200_000 },
    // Psikologi
    { programStudi_id: prodiId('PSI'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 5_000_000, biayaTambahan: 500_000, minBiayaTambahan: 100_000 },
    { programStudi_id: prodiId('PSI'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 4_000_000 },
    // Pendidikan Dokter
    { programStudi_id: prodiId('PD'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 40_000_000, biayaTambahan: 5_000_000, minBiayaTambahan: 1_000_000 },
    { programStudi_id: prodiId('PD'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 35_000_000, biayaTambahan: 5_000_000, minBiayaTambahan: 1_000_000 },
    { programStudi_id: prodiId('PD'), jalur_id: jalurId('Jalur Beasiswa'), kelas_id: kelasId('RP'), biaya: 20_000_000 },
    // Profesi Dokter
    { programStudi_id: prodiId('PROFDOK'), jalur_id: jalurId('Jalur Reguler'), biaya: 15_000_000 },
    // Farmasi
    { programStudi_id: prodiId('FARM'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('RP'), biaya: 7_000_000, biayaTambahan: 700_000, minBiayaTambahan: 150_000 },
    { programStudi_id: prodiId('FARM'), jalur_id: jalurId('Jalur Prestasi Akademik'), kelas_id: kelasId('RP'), biaya: 5_500_000 },
    { programStudi_id: prodiId('FARM'), jalur_id: jalurId('Jalur Beasiswa'), kelas_id: kelasId('RP'), biaya: 3_500_000 },
    // Profesi Apoteker
    { programStudi_id: prodiId('APOT'), jalur_id: jalurId('Jalur Reguler'), biaya: 8_000_000 },
    // Magister Manajemen
    { programStudi_id: prodiId('MM'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('KK'), biaya: 8_000_000, biayaTambahan: 800_000, minBiayaTambahan: 200_000 },
    // Magister Hukum
    { programStudi_id: prodiId('MH'), jalur_id: jalurId('Jalur Reguler'), kelas_id: kelasId('KK'), biaya: 7_500_000, biayaTambahan: 750_000, minBiayaTambahan: 200_000 },
  ];

  const defaultJadwalBiaya = jadwalId('Pendaftaran Gelombang 1', tahun);
  await Biaya.updateMany(
    { $or: [{ jadwal_id: { $exists: false } }, { jadwal_id: null }] },
    { $set: { jadwal_id: defaultJadwalBiaya } },
  );
  const biayaSeed: BayaSeedItem[] = biayaSeedBase.map((b) => ({
    ...b,
    jadwal_id: defaultJadwalBiaya,
  }));

  let biayaInserted = 0;
  for (const b of biayaSeed) {
    const filter: Record<string, unknown> = {
      programStudi_id: b.programStudi_id,
      jalur_id: b.jalur_id,
      jadwal_id: b.jadwal_id,
    };
    if (b.kelas_id) filter.kelas_id = b.kelas_id;
    const res = await Biaya.updateOne(filter, { $setOnInsert: b }, { upsert: true });
    if (res.upsertedCount) biayaInserted++;
  }
  console.log(`[seed] ${biayaInserted} biaya baru diinsert (dari ${biayaSeed.length} total seed)`);

  // ─── FAQ ─────────────────────────────────────────────────────────────────
  const faqSeed = [
    // Teknis
    {
      pertanyaan: 'Bagaimana cara mendaftar ke UNJANI?',
      jawaban:
        'Pendaftaran dilakukan secara online melalui portal pendaftaran UNJANI. Siapkan dokumen yang diperlukan seperti ijazah/SKHUN, foto, dan KTP, lalu ikuti langkah-langkah yang tertera di sistem.',
      pertanyaan_en: 'How do I register at UNJANI?',
      jawaban_en:
        'Registration is done online through the UNJANI registration portal. Prepare required documents such as diploma/graduation certificate, photo, and ID card, then follow the steps in the system.',
      kategori: 'Teknis' as const,
      urutan: 10,
    },
    {
      pertanyaan: 'Dokumen apa saja yang diperlukan untuk pendaftaran?',
      jawaban:
        'Dokumen yang diperlukan antara lain: (1) Ijazah atau Surat Keterangan Lulus, (2) Rapor semester 1-5, (3) Foto berwarna terbaru 3×4, (4) Fotokopi KTP/Kartu Pelajar, (5) Akta kelahiran.',
      kategori: 'Teknis' as const,
      urutan: 20,
    },
    {
      pertanyaan: 'Apakah pendaftaran bisa dilakukan secara offline?',
      jawaban:
        'Saat ini pendaftaran hanya tersedia secara online melalui portal resmi PMB UNJANI. Jika mengalami kesulitan teknis, hubungi panitia PMB melalui nomor yang tertera.',
      kategori: 'Teknis' as const,
      urutan: 30,
    },
    {
      pertanyaan: 'Berapa lama proses verifikasi dokumen?',
      jawaban:
        'Proses verifikasi dokumen biasanya memakan waktu 2-5 hari kerja setelah semua dokumen lengkap diunggah. Anda akan mendapatkan notifikasi melalui email atau portal pendaftaran.',
      kategori: 'Teknis' as const,
      urutan: 40,
    },
    // Biaya
    {
      pertanyaan: 'Berapa biaya pendaftaran PMB UNJANI?',
      jawaban:
        'Biaya pendaftaran bervariasi tergantung jalur dan program studi yang dipilih. Gunakan fitur Kalkulator PMB di situs ini untuk memperkirakan biaya yang sesuai dengan pilihan Anda.',
      kategori: 'Biaya' as const,
      urutan: 10,
    },
    {
      pertanyaan: 'Apakah biaya pendaftaran bisa dicicil?',
      jawaban:
        'Biaya SPP/UKT dapat dicicil sesuai kebijakan yang berlaku. Untuk informasi lebih lanjut mengenai mekanisme cicilan, hubungi Biro Keuangan UNJANI.',
      kategori: 'Biaya' as const,
      urutan: 20,
    },
    {
      pertanyaan: 'Apakah ada beasiswa yang tersedia?',
      jawaban:
        'Ya, UNJANI menyediakan beberapa jalur beasiswa meliputi beasiswa prestasi akademik, beasiswa ekonomi tidak mampu, dan beasiswa dari lembaga eksternal (KIP-Kuliah, beasiswa perusahaan, dll).',
      kategori: 'Biaya' as const,
      urutan: 30,
    },
    {
      pertanyaan: 'Apakah biaya pendaftaran dikembalikan jika tidak lulus seleksi?',
      jawaban:
        'Biaya pendaftaran tidak dapat dikembalikan setelah proses pendaftaran selesai, sesuai dengan ketentuan yang berlaku di UNJANI.',
      kategori: 'Biaya' as const,
      urutan: 40,
    },
    // Jadwal
    {
      pertanyaan: 'Kapan jadwal tes seleksi masuk UNJANI?',
      jawaban:
        'Jadwal tes seleksi berbeda untuk setiap gelombang. Lihat jadwal lengkap pada halaman Jadwal PMB di situs ini.',
      kategori: 'Jadwal' as const,
      urutan: 10,
    },
    {
      pertanyaan: 'Kapan pengumuman kelulusan seleksi?',
      jawaban:
        'Pengumuman kelulusan akan disampaikan melalui portal pendaftaran sesuai jadwal yang telah ditetapkan. Pastikan Anda memantau portal pendaftaran dan email yang didaftarkan secara berkala.',
      kategori: 'Jadwal' as const,
      urutan: 20,
    },
    {
      pertanyaan: 'Apakah ada kesempatan jika tidak lulus di Gelombang 1?',
      jawaban:
        'Ya, calon mahasiswa yang tidak lulus di Gelombang 1 dapat mendaftar kembali di Gelombang 2 sesuai jadwal yang tersedia.',
      kategori: 'Jadwal' as const,
      urutan: 30,
    },
    {
      pertanyaan: 'Berapa lama batas waktu registrasi ulang setelah dinyatakan lulus?',
      jawaban:
        'Registrasi ulang harus dilakukan sesuai jadwal yang ditetapkan. Keterlambatan registrasi ulang dapat mengakibatkan batalnya status kelulusan. Pantau terus portal pendaftaran untuk informasi terbaru.',
      kategori: 'Jadwal' as const,
      urutan: 40,
    },
  ];
  let faqInserted = 0;
  for (const f of faqSeed) {
    const res = await FAQ.updateOne(
      { pertanyaan: f.pertanyaan },
      { $setOnInsert: { ...f, aktif: true } },
      { upsert: true },
    );
    if (res.upsertedCount) faqInserted++;
  }
  console.log(`[seed] ${faqInserted} FAQ baru diinsert (dari ${faqSeed.length} total seed)`);

  // ─── Pengumuman ───────────────────────────────────────────────────────────
  const pengumumanSeed = [
    {
      judul: 'Pendaftaran PMB UNJANI Tahun Akademik 2026/2027 Dibuka',
      slug: 'pembukaan-pmb-2026-2027',
      ringkasan:
        'Pendaftaran Penerimaan Mahasiswa Baru UNJANI resmi dibuka untuk tahun akademik 2026/2027.',
      konten:
        '<p>Panitia PMB UNJANI dengan bangga mengumumkan pembukaan pendaftaran mahasiswa baru untuk Tahun Akademik 2026/2027. Seluruh informasi terkait jalur seleksi, jadwal, biaya, dan tata cara pendaftaran dapat diakses melalui situs resmi ini.</p><p>Untuk memudahkan, silakan gunakan <strong>Kalkulator PMB</strong> untuk mengestimasi biaya, dan unduh <strong>Manual Book</strong> sebagai panduan pendaftaran.</p>',
      pinned: true,
      aktif: true,
      publishedAt: new Date('2026-02-01'),
    },
    {
      judul: 'Informasi Jalur Beasiswa PMB UNJANI 2026/2027',
      slug: 'jalur-beasiswa-pmb-2026-2027',
      ringkasan:
        'UNJANI membuka kuota jalur beasiswa prestasi dan beasiswa ekonomi tidak mampu untuk PMB 2026/2027.',
      konten:
        '<p>Universitas Jenderal Achmad Yani membuka pendaftaran melalui Jalur Beasiswa untuk Tahun Akademik 2026/2027. Tersedia dua skema beasiswa: <strong>Beasiswa Prestasi</strong> bagi calon mahasiswa dengan nilai akademik tinggi, dan <strong>Beasiswa Ekonomi</strong> bagi calon mahasiswa dari keluarga kurang mampu.</p><p>Kuota beasiswa terbatas, segera ajukan permohonan sebelum batas waktu pendaftaran.</p>',
      pinned: false,
      aktif: true,
      publishedAt: new Date('2026-02-05'),
    },
    {
      judul: 'Pengumuman Jadwal Tes Seleksi Gelombang 1',
      slug: 'jadwal-tes-seleksi-gelombang-1-2026',
      ringkasan:
        'Tes seleksi masuk Gelombang 1 akan dilaksanakan pada 10-15 Mei 2026 di kampus UNJANI Cimahi.',
      konten:
        '<p>Bagi calon mahasiswa yang telah menyelesaikan proses pendaftaran Gelombang 1, tes seleksi masuk akan dilaksanakan pada <strong>10–15 Mei 2026</strong> bertempat di Kampus UNJANI, Jl. Terusan Jenderal Sudirman, Cimahi.</p><p>Peserta wajib membawa kartu peserta ujian yang dapat diunduh melalui portal pendaftaran, serta kartu identitas asli. Peserta harap hadir 30 menit sebelum ujian dimulai.</p>',
      pinned: false,
      aktif: true,
      publishedAt: new Date('2026-04-25'),
    },
  ];
  for (const p of pengumumanSeed) {
    await Pengumuman.updateOne({ slug: p.slug }, { $setOnInsert: p }, { upsert: true });
  }
  console.log(`[seed] ${pengumumanSeed.length} pengumuman siap`);

  await mongoose.disconnect();
  console.log('[seed] selesai ✓');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
