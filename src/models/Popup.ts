import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const PopupSchema = new Schema(
  {
    judul: { type: String, required: true, trim: true },
    alt: { type: String, default: '', trim: true },
    gambarFilename: { type: String, required: true }, // stored on disk under uploads/popup/
    gambarMime: { type: String, default: 'image/jpeg' },
    url: { type: String, default: '' }, // klik tujuan; kosong = tidak clickable
    aktif: { type: Boolean, default: true, index: true },
    tampilDari: { type: Date, default: null },
    tampilSampai: { type: Date, default: null },
    hideForDays: { type: Number, default: 1, min: 0, max: 365 },
    durasiTampil: { type: Number, default: 5, min: 0, max: 3600 },
    urutan: { type: Number, default: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type PopupDoc = InferSchemaType<typeof PopupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Popup =
  (models.Popup as mongoose.Model<PopupDoc> | undefined) ||
  model<PopupDoc>('Popup', PopupSchema);
