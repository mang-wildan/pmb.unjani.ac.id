import mongoose, {
  Schema,
  model,
  models,
  type FilterQuery,
  type InferSchemaType,
} from 'mongoose';

const ArtikelSchema = new Schema(
  {
    judul: { type: String, required: true, trim: true },
    judul_en: { type: String, default: '', trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    isi: { type: String, required: true },
    isi_en: { type: String, default: '' },
    coverImage: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['draft', 'terjadwal', 'terbit', 'arsip'],
      default: 'draft',
      required: true,
      index: true,
    },
    publishedAt: { type: Date, default: null, index: true },
    pinned: { type: Boolean, default: false, index: true },
    kategori_id: {
      type: Schema.Types.ObjectId,
      ref: 'KategoriArtikel',
      required: true,
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    metaTitle: { type: String, default: '', trim: true },
    metaDescription: { type: String, default: '', trim: true },
    ogImage: { type: String, default: '', trim: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      required: true,
      index: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

ArtikelSchema.index({ status: 1, publishedAt: -1 });
ArtikelSchema.index({ pinned: -1, publishedAt: -1 });

export type ArtikelDoc = InferSchemaType<typeof ArtikelSchema> & {
  _id: mongoose.Types.ObjectId;
};

/** Kondisi tunggal yang wajib dipakai seluruh pembaca artikel publik. */
export function filterArtikelLayakTampilPublik(
  sekarang = new Date(),
): FilterQuery<ArtikelDoc> {
  return {
    deletedAt: null,
    $or: [
      { status: 'terbit' },
      { status: 'terjadwal', publishedAt: { $lte: sekarang } },
    ],
  };
}

export const Artikel =
  (models.Artikel as mongoose.Model<ArtikelDoc> | undefined) ||
  model<ArtikelDoc>('Artikel', ArtikelSchema);
