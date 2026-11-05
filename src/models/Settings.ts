import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const SocialSchema = new Schema(
  {
    nama: { type: String, required: true },
    url: { type: String, required: true },
    ikon: { type: String, default: '' },
  },
  { _id: false },
);

const RecaptchaSchema = new Schema(
  {
    aktif: { type: Boolean, default: false },
    siteKey: { type: String, default: '' },
    secretKey: { type: String, default: '' },
  },
  { _id: false },
);

const SettingsSchema = new Schema(
  {
    singleton: { type: String, default: 'main', unique: true, index: true },
    siteName: { type: String, default: 'PMB UNJANI' },
    tagline: { type: String, default: 'Gerbang Masa Depanmu di Universitas Jenderal Achmad Yani' },
    urlPendaftaran: { type: String, default: 'https://pendaftaran.unjani.ac.id/loginnew' },
    alamat: {
      type: String,
      default: 'Jl. Terusan Jenderal Sudirman, Cimahi, Jawa Barat',
    },
    email: { type: String, default: 'pmb@unjani.ac.id' },
    telepon: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    sosmed: { type: [SocialSchema], default: [] },
    googleAnalyticsId: { type: String, default: '' },
    googleSiteVerification: { type: String, default: '' },
    defaultMetaTitle: { type: String, default: '' },
    defaultMetaDescription: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    instagramAccessToken: { type: String, default: '' },
    instagramFeedAktif: { type: Boolean, default: true },
    recaptcha: { type: RecaptchaSchema, default: () => ({}) },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type SettingsDoc = InferSchemaType<typeof SettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type PublicSettings = {
  tagline?: string;
  urlPendaftaran?: string;
  alamat?: string;
  email?: string;
  telepon?: string;
  whatsapp?: string;
  sosmed?: Array<{ nama: string; url: string; ikon?: string }>;
};

export const Settings =
  (models.Settings as mongoose.Model<SettingsDoc> | undefined) ||
  model<SettingsDoc>('Settings', SettingsSchema);

export async function getSettings(): Promise<SettingsDoc> {
  const existing = await Settings.findOne({ singleton: 'main' }).lean<SettingsDoc>();
  if (existing) return existing;
  const created = await Settings.create({ singleton: 'main' });
  return created.toObject() as SettingsDoc;
}
