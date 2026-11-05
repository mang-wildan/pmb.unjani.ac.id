import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const BiayaSchema = new Schema(
  {
    programStudi_id: { type: Schema.Types.ObjectId, ref: 'ProgramStudi', required: true, index: true },
    jalur_id: { type: Schema.Types.ObjectId, ref: 'JalurSeleksi', required: true, index: true },
    jadwal_id: { type: Schema.Types.ObjectId, ref: 'Jadwal', required: true, index: true },
    kelas_id: { type: Schema.Types.ObjectId, ref: 'Kelas', index: true },
    biaya: { type: Number, required: true, min: 0 },
    biayaPerSemester: { type: Number, min: 0 },
    biayaTambahan: { type: Number, min: 0 },
    persentase: { type: [String], default: ['100%'] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type BiayaDoc = InferSchemaType<typeof BiayaSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Biaya =
  (models.Biaya as mongoose.Model<BiayaDoc> | undefined) ||
  model<BiayaDoc>('Biaya', BiayaSchema);
