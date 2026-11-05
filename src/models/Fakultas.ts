import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const FakultasSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    singkatan: { type: String, required: true, trim: true, uppercase: true },
    warna: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type FakultasDoc = InferSchemaType<typeof FakultasSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Fakultas =
  (models.Fakultas as mongoose.Model<FakultasDoc> | undefined) ||
  model<FakultasDoc>('Fakultas', FakultasSchema);
