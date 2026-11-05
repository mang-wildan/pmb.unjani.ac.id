import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const JalurSeleksiSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    nama_en: { type: String, default: '', trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    ringkasan: { type: String, default: '', trim: true, maxlength: 400 },
    ringkasan_en: { type: String, default: '', trim: true, maxlength: 400 },
    deskripsi: { type: String, default: '' },
    deskripsi_en: { type: String, default: '' },
    persyaratan: { type: [String], default: [] },
    urutan: { type: Number, default: 100, index: true },
    aktif: { type: Boolean, default: true, index: true },
    badge: { type: String, default: '', trim: true }, // e.g. "Baru", "Favorit"
  },
  { timestamps: true, versionKey: false },
);

export type JalurSeleksiDoc = InferSchemaType<typeof JalurSeleksiSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const JalurSeleksi =
  (models.JalurSeleksi as mongoose.Model<JalurSeleksiDoc> | undefined) ||
  model<JalurSeleksiDoc>('JalurSeleksi', JalurSeleksiSchema);
