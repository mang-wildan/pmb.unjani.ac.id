import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const PengumumanSchema = new Schema(
  {
    judul: { type: String, required: true, trim: true },
    judul_en: { type: String, default: '', trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    ringkasan: { type: String, default: '', trim: true, maxlength: 320 },
    ringkasan_en: { type: String, default: '', trim: true, maxlength: 320 },
    konten: { type: String, default: '' },
    konten_en: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    pinned: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: () => new Date(), index: true },
    aktif: { type: Boolean, default: true, index: true },
    metaTitle: { type: String, default: '', trim: true, maxlength: 120 },
    metaDescription: { type: String, default: '', trim: true, maxlength: 220 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

PengumumanSchema.index({ aktif: 1, publishedAt: -1 });

export type PengumumanDoc = InferSchemaType<typeof PengumumanSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Pengumuman =
  (models.Pengumuman as mongoose.Model<PengumumanDoc> | undefined) ||
  model<PengumumanDoc>('Pengumuman', PengumumanSchema);
