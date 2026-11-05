import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const DokumenSchema = new Schema(
  {
    kategori: {
      type: String,
      enum: ['biaya', 'manual-book', 'lainnya'],
      required: true,
      index: true,
    },
    tahun: { type: String, default: '', trim: true, maxlength: 20, index: true },
    judul: { type: String, required: true, trim: true },
    judul_en: { type: String, default: '', trim: true },
    deskripsi: { type: String, default: '', trim: true, maxlength: 500 },
    filename: { type: String, required: true }, // stored name on disk
    originalName: { type: String, required: true },
    ukuranByte: { type: Number, required: true },
    mime: { type: String, required: true, default: 'application/pdf' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    urutan: { type: Number, default: 100 },
    aktif: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

export type DokumenDoc = InferSchemaType<typeof DokumenSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Dokumen =
  (models.Dokumen as mongoose.Model<DokumenDoc> | undefined) ||
  model<DokumenDoc>('Dokumen', DokumenSchema);
