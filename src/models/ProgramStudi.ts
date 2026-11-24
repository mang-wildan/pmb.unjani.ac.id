import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const ProgramStudiSchema = new Schema(
  {
    nama: { type: String, required: true, trim: true },
    singkatan: { type: String, required: true, trim: true, uppercase: true },
    jenjang_id: { type: Schema.Types.ObjectId, ref: 'Jenjang', required: true },
    fakultas_id: { type: Schema.Types.ObjectId, ref: 'Fakultas', required: true },
    akreditasi: { type: String, default: '', trim: true },
    persyaratan: { type: [String], default: [] },
    aktif: { type: Boolean, default: true, index: true },
    fileAkreditasi: {
      filename: { type: String, default: '' },
      originalName: { type: String, default: '' },
      ukuranByte: { type: Number, default: 0 },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type ProgramStudiDoc = InferSchemaType<typeof ProgramStudiSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ProgramStudi =
  (models.ProgramStudi as mongoose.Model<ProgramStudiDoc> | undefined) ||
  model<ProgramStudiDoc>('ProgramStudi', ProgramStudiSchema);
