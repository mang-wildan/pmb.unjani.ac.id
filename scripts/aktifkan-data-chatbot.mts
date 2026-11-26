// Aktifkan data lama yang belum punya field `aktif` agar terbaca chatbot PMB.
// Hanya menyentuh dokumen tanpa field `aktif`; data yang sudah punya nilai tidak diubah.
// Jalankan: npx tsx --env-file=.env scripts/aktifkan-data-chatbot.ts
import mongoose from 'mongoose';
import { ProgramStudi } from '../src/models/ProgramStudi';
import { Biaya } from '../src/models/Biaya';

const uri = process.env.MONGO_URI || process.env.MONGO_DIRECT_URI;
if (!uri) {
  console.error('MONGO_URI kosong. Jalankan: npx tsx --env-file=.env scripts/aktifkan-data-chatbot.ts');
  process.exit(1);
}

await mongoose.connect(uri);
const belumDiisi = { aktif: { $exists: false } };
try {
  const prodi = await ProgramStudi.updateMany(belumDiisi, { $set: { aktif: true } });
  const biaya = await Biaya.updateMany(belumDiisi, { $set: { aktif: true } });
  console.log(`Program studi diaktifkan: ${prodi.modifiedCount}`);
  console.log(`Biaya diaktifkan: ${biaya.modifiedCount}`);

  // Sabuk pemeriksaan: chatbot tetap tidak melihat data bila masih ada yang nonaktif.
  const sisaProdi = await ProgramStudi.countDocuments({ aktif: { $ne: true } });
  const sisaBiaya = await Biaya.countDocuments({ aktif: { $ne: true } });
  const totalProdi = await ProgramStudi.countDocuments();
  const totalBiaya = await Biaya.countDocuments();
  console.log(`Total prodi aktif: ${totalProdi - sisaProdi}/${totalProdi}`);
  console.log(`Total biaya aktif: ${totalBiaya - sisaBiaya}/${totalBiaya}`);
  if (sisaProdi || sisaBiaya) {
    console.error(`Masih ada data nonaktif (prodi ${sisaProdi}, biaya ${sisaBiaya}). Tinjau lewat admin.`);
    process.exitCode = 1;
  }
} finally {
  await mongoose.disconnect();
}
