import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminUserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    nama: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'editor'],
      default: 'editor',
      required: true,
    },
    aktif: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    // MFA TOTP (FR-06–FR-10). Akun existing otomatis mfaAktif=false sehingga wajib mendaftar.
    mfaAktif: { type: Boolean, default: false },
    mfaRahasia: { type: String, default: '', select: false }, // terenkripsi (AES-256-GCM)
    mfaKodePemulihan: { type: [String], default: [], select: false }, // hash SHA-256, sekali pakai
    mfaPeriodeTerakhir: { type: Number, default: null }, // anti-replay TOTP
    mfaDiaktifkanPada: { type: Date, default: null },
    // Dinaikkan untuk mencabut semua sesi akun (FR-11).
    versiSesi: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

AdminUserSchema.methods.verifyPassword = async function (plain: string) {
  return bcrypt.compare(plain, this.passwordHash);
};

AdminUserSchema.statics.hashPassword = async function (plain: string) {
  return bcrypt.hash(plain, 12);
};

export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema> & {
  _id: mongoose.Types.ObjectId;
  verifyPassword(plain: string): Promise<boolean>;
};

type AdminUserModel = mongoose.Model<AdminUserDoc> & {
  hashPassword(plain: string): Promise<string>;
};

export const AdminUser =
  (models.AdminUser as AdminUserModel | undefined) ||
  model<AdminUserDoc, AdminUserModel>('AdminUser', AdminUserSchema);
