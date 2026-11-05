import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const JenjangSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    singkatan: { type: String, required: true, trim: true, uppercase: true },
    warna: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type JenjangDoc = InferSchemaType<typeof JenjangSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Jenjang =
  (models.Jenjang as mongoose.Model<JenjangDoc> | undefined) ||
  model<JenjangDoc>('Jenjang', JenjangSchema);
