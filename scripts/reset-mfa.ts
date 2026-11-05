// Reset MFA oleh operator server (FR-09, TBD-07): jalur darurat bila tidak ada superadmin yang
// bisa login (mis. satu-satunya superadmin kehilangan HP dan kode pemulihan).
//
//   npx tsx scripts/reset-mfa.ts <email>          → tampilkan akun, tanpa mengubah apa pun
//   npx tsx scripts/reset-mfa.ts <email> --ya     → reset MFA + cabut semua sesi akun tsb.
//
// Efek sama dengan tombol "Reset MFA" di halaman Pengguna; tercatat di Log Aktivitas sebagai
// aksi operator. Membaca .env lalu .env.local seperti seed; variabel yang sudah diset di
// lingkungan shell TIDAK ditimpa (agar operator bisa menunjuk database lain secara eksplisit).
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import dotenv from 'dotenv';

const asli = new Set(Object.keys(process.env));
for (const f of ['.env', '.env.local']) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  const isi = dotenv.parse(fs.readFileSync(p));
  for (const [k, v] of Object.entries(isi)) if (!asli.has(k)) process.env[k] = v;
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase();
  const ya = args.includes('--ya');
  if (!email || !email.includes('@')) {
    console.error('Pemakaian: npx tsx scripts/reset-mfa.ts <email> [--ya]');
    process.exit(2);
  }

  // Impor setelah env dimuat: src/lib/db.ts membaca MONGO_URI saat diimpor.
  const mongoose = (await import('mongoose')).default;
  const { connectDb } = await import('../src/lib/db');
  const { AdminUser } = await import('../src/models/AdminUser');
  const { writeAuditLog } = await import('../src/models/AuditLog');
  const { resetMfaAkun } = await import('../src/lib/resetMfa');

  await connectDb();
  console.log(`Database: ${mongoose.connection.db?.databaseName}`);
  const user = await AdminUser.findOne({ email })
    .select('email nama role aktif mfaAktif mfaDiaktifkanPada +mfaKodePemulihan')
    .lean();
  if (!user) {
    console.error(`Akun ${email} tidak ditemukan.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(
    `Akun: ${user.email} (${user.nama}, ${user.role}, ${user.aktif ? 'aktif' : 'nonaktif'}) — MFA ${
      user.mfaAktif ? `aktif sejak ${user.mfaDiaktifkanPada?.toISOString() ?? '-'}` : 'belum aktif'
    }, sisa kode pemulihan ${user.mfaKodePemulihan?.length ?? 0}`,
  );

  if (!ya) {
    console.log('Belum ada yang diubah. Ulangi dengan --ya untuk mereset MFA dan mencabut semua sesi akun ini.');
    await mongoose.disconnect();
    return;
  }

  const hasil = await resetMfaAkun({ email });
  if (!hasil) {
    console.error('Akun hilang saat proses reset.');
    await mongoose.disconnect();
    process.exit(1);
  }
  const operator = `${os.userInfo().username}@${os.hostname()}`;
  await writeAuditLog({
    email: hasil.email,
    aksi: 'mfa_reset',
    entitas: 'AdminUser',
    entitasId: hasil.id,
    ringkasan: `Reset MFA oleh operator server (scripts/reset-mfa.ts, ${operator}): ${hasil.email} (sesi dicabut)`,
    before: hasil.sebelum,
    after: { mfaAktif: false, sisaKodePemulihan: 0, sesiDicabut: true },
    ip: 'operator',
    userAgent: 'scripts/reset-mfa.ts',
  });
  console.log(`Selesai: MFA ${hasil.email} direset dan semua sesinya dicabut. Login berikutnya wajib mendaftar MFA ulang.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Gagal:', error instanceof Error ? error.message : error);
  process.exit(1);
});
