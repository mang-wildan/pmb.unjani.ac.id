import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const KelasSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    singkatan: { type: String, required: true, trim: true, uppercase: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type KelasDoc = InferSchemaType<typeof KelasSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Kelas =
  (models.Kelas as mongoose.Model<KelasDoc> | undefined) ||
  model<KelasDoc>('Kelas', KelasSchema);
