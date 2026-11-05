import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

/**
 * Penghitung login gagal per email dan per IP (FR-01, FR-02). Satu dokumen per (jenis, kunci);
 * hilang otomatis oleh TTL index 15 menit setelah kegagalan terakhir, sehingga data email/IP
 * tidak tersimpan lebih lama dari yang dibutuhkan.
 */
const PercobaanLoginGagalSchema = new Schema(
  {
    jenis: { type: String, enum: ['email', 'ip'], required: true },
    /** Email ternormalisasi (huruf kecil, tanpa spasi tepi) atau alamat IP. */
    kunci: { type: String, required: true, maxlength: 320 },
    jumlah: { type: Number, required: true, default: 0, min: 0 },
    gagalTerakhir: { type: Date, required: true },
    /** gagalTerakhir + 15 menit; dokumen dihapus MongoDB setelah waktu ini. */
    kedaluwarsaPada: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

PercobaanLoginGagalSchema.index({ jenis: 1, kunci: 1 }, { unique: true });
PercobaanLoginGagalSchema.index({ kedaluwarsaPada: 1 }, { expireAfterSeconds: 0 });

export type PercobaanLoginGagalDoc = InferSchemaType<typeof PercobaanLoginGagalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PercobaanLoginGagal =
  (models.PercobaanLoginGagal as mongoose.Model<PercobaanLoginGagalDoc> | undefined) ||
  model<PercobaanLoginGagalDoc>('PercobaanLoginGagal', PercobaanLoginGagalSchema);
