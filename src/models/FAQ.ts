import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const FAQSchema = new Schema(
  {
    pertanyaan: { type: String, required: true, trim: true },
    jawaban: { type: String, required: true, trim: true },
    pertanyaan_en: { type: String, default: '', trim: true },
    jawaban_en: { type: String, default: '', trim: true },
    kategori: {
      type: String,
      enum: ['Teknis', 'Biaya', 'Jadwal'],
      required: true,
      index: true,
    },
    urutan: { type: Number, default: 100, index: true },
    aktif: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

FAQSchema.index({ aktif: 1, kategori: 1, urutan: 1 });

export type FAQDoc = InferSchemaType<typeof FAQSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FAQ =
  (models.FAQ as mongoose.Model<FAQDoc> | undefined) ||
  model<FAQDoc>('FAQ', FAQSchema);
