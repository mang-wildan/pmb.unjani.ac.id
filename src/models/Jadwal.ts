import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const JadwalSchema = new Schema(
  {
    judul:    { type: String, required: true, trim: true },
    ke:       { type: Number, required: true, min: 1 },
    jalur:    { type: [{ type: Schema.Types.ObjectId, ref: 'JalurSeleksi' }], required: true },
    mulai:    { type: Date, required: true },
    selesai:  { type: Date, required: true },
    status:   { type: Boolean, default: true, index: true },
    tahun:    { type: String, required: true, index: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

JadwalSchema.index({ tahun: 1, mulai: 1 });

export type JadwalDoc = InferSchemaType<typeof JadwalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Jadwal =
  (models.Jadwal as mongoose.Model<JadwalDoc> | undefined) ||
  model<JadwalDoc>('Jadwal', JadwalSchema);
