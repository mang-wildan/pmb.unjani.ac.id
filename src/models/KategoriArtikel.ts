import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const KategoriArtikelSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    nama_en: { type: String, default: '', trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type KategoriArtikelDoc = InferSchemaType<typeof KategoriArtikelSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const KategoriArtikel =
  (models.KategoriArtikel as mongoose.Model<KategoriArtikelDoc> | undefined) ||
  model<KategoriArtikelDoc>('KategoriArtikel', KategoriArtikelSchema);
