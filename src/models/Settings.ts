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

// Provider chatbot yang didukung. Satu provider aktif pada satu waktu, tetapi tiap provider
// menyimpan nama model dan API key-nya sendiri agar admin bisa berganti tanpa menulis ulang.
export const PROVIDER_CHATBOT = ['openrouter', 'deepseek', 'gemini'] as const;
export type ProviderChatbot = (typeof PROVIDER_CHATBOT)[number];

// API key tersimpan TERENKRIPSI (AES-256-GCM, lihat src/lib/chatbotSecret.ts); field ini tidak
// pernah dikirim utuh ke klien maupun dicatat di audit log.
export const KEY_API_PROVIDER: Record<ProviderChatbot, ApiKeyChatbotField> = {
  openrouter: 'apiKeyOpenRouter',
  deepseek: 'apiKeyDeepSeek',
  gemini: 'apiKeyGemini',
};
export type ApiKeyChatbotField = 'apiKeyOpenRouter' | 'apiKeyDeepSeek' | 'apiKeyGemini';

export const MODEL_PROVIDER: Record<ProviderChatbot, ModelChatbotField> = {
  openrouter: 'modelOpenRouter',
  deepseek: 'modelDeepSeek',
  gemini: 'modelGemini',
};
export type ModelChatbotField = 'modelOpenRouter' | 'modelDeepSeek' | 'modelGemini';

/** Default tunggal untuk skema + serialisasi, termasuk saat subdok lama hanya berisi field parsial. */
export const CHATBOT_DEFAULT = {
  aktif: false,
  provider: 'openrouter' as ProviderChatbot,
  modelOpenRouter: 'google/gemini-2.0-flash-001',
  modelDeepSeek: 'deepseek-chat',
  modelGemini: 'gemini-2.0-flash',
  ambangPuasTanya: 3,
  pesanPembuka:
    'Halo! Saya asisten virtual PMB UNJANI. Ada yang bisa saya bantu seputar pendaftaran, jurusan, atau biaya kuliah?',
} as const;

const ChatbotSchema = new Schema(
  {
    aktif: { type: Boolean, default: CHATBOT_DEFAULT.aktif },
    provider: { type: String, enum: PROVIDER_CHATBOT, default: CHATBOT_DEFAULT.provider },
    modelOpenRouter: { type: String, default: CHATBOT_DEFAULT.modelOpenRouter },
    modelDeepSeek: { type: String, default: CHATBOT_DEFAULT.modelDeepSeek },
    modelGemini: { type: String, default: CHATBOT_DEFAULT.modelGemini },
    apiKeyOpenRouter: { type: String, default: '' },
    apiKeyDeepSeek: { type: String, default: '' },
    apiKeyGemini: { type: String, default: '' },
    ambangPuasTanya: { type: Number, default: CHATBOT_DEFAULT.ambangPuasTanya, min: 1, max: 10 },
    pesanPembuka: { type: String, default: CHATBOT_DEFAULT.pesanPembuka },
  },
  { _id: false },
);

/** Nama model provider; pakai default bila field belum ada (bukan bila sengaja dikosongkan). */
export function modelUntukProvider(
  chatbot: Partial<ChatbotSettings> | undefined | null,
  provider: ProviderChatbot,
): string {
  return chatbot?.[MODEL_PROVIDER[provider]] ?? CHATBOT_DEFAULT[MODEL_PROVIDER[provider]];
}

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
    chatbot: { type: ChatbotSchema, default: () => ({}) },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true, versionKey: false },
);

export type ChatbotSettings = InferSchemaType<typeof ChatbotSchema>;

/** Hanya konfigurasi aman untuk admin; status kunci, tanpa plaintext maupun ciphertext. */
export type ChatbotSettingsKlien = Omit<ChatbotSettings, ApiKeyChatbotField> & {
  apiKeyOpenRouterTerisi: boolean;
  apiKeyDeepSeekTerisi: boolean;
  apiKeyGeminiTerisi: boolean;
};

/** Subset yang boleh dipakai halaman publik: tanpa provider, model, atau kredensial. */
export type ChatbotPublicSettings = {
  aktif: boolean;
  pesanPembuka: string;
  ambangPuasTanya: number;
};

export function chatbotUntukPublik(
  chatbot: Partial<ChatbotSettings> | undefined | null,
): ChatbotPublicSettings {
  return {
    aktif: chatbot?.aktif === true,
    pesanPembuka: chatbot?.pesanPembuka ?? CHATBOT_DEFAULT.pesanPembuka,
    ambangPuasTanya: chatbot?.ambangPuasTanya ?? CHATBOT_DEFAULT.ambangPuasTanya,
  };
}

/** Salinan admin: tidak memuat ciphertext/plaintext key, hanya status terisi. */
export function chatbotUntukAdmin(
  chatbot: Partial<ChatbotSettings> | undefined | null,
): ChatbotSettingsKlien {
  return {
    aktif: chatbot?.aktif ?? false,
    provider: chatbot?.provider ?? CHATBOT_DEFAULT.provider,
    modelOpenRouter: chatbot?.modelOpenRouter ?? CHATBOT_DEFAULT.modelOpenRouter,
    modelDeepSeek: chatbot?.modelDeepSeek ?? CHATBOT_DEFAULT.modelDeepSeek,
    modelGemini: chatbot?.modelGemini ?? CHATBOT_DEFAULT.modelGemini,
    ambangPuasTanya: chatbot?.ambangPuasTanya ?? CHATBOT_DEFAULT.ambangPuasTanya,
    pesanPembuka: chatbot?.pesanPembuka ?? CHATBOT_DEFAULT.pesanPembuka,
    apiKeyOpenRouterTerisi: Boolean(chatbot?.apiKeyOpenRouter),
    apiKeyDeepSeekTerisi: Boolean(chatbot?.apiKeyDeepSeek),
    apiKeyGeminiTerisi: Boolean(chatbot?.apiKeyGemini),
  };
}

/** Salinan audit: credential selalu diganti penanda, bukan ciphertext. */
export function chatbotUntukAudit(
  chatbot: Partial<ChatbotSettings> | undefined | null,
): ChatbotSettings {
  return {
    aktif: chatbot?.aktif ?? false,
    provider: chatbot?.provider ?? CHATBOT_DEFAULT.provider,
    modelOpenRouter: chatbot?.modelOpenRouter ?? CHATBOT_DEFAULT.modelOpenRouter,
    modelDeepSeek: chatbot?.modelDeepSeek ?? CHATBOT_DEFAULT.modelDeepSeek,
    modelGemini: chatbot?.modelGemini ?? CHATBOT_DEFAULT.modelGemini,
    ambangPuasTanya: chatbot?.ambangPuasTanya ?? CHATBOT_DEFAULT.ambangPuasTanya,
    pesanPembuka: chatbot?.pesanPembuka ?? CHATBOT_DEFAULT.pesanPembuka,
    apiKeyOpenRouter: chatbot?.apiKeyOpenRouter ? '[tersimpan]' : '',
    apiKeyDeepSeek: chatbot?.apiKeyDeepSeek ? '[tersimpan]' : '',
    apiKeyGemini: chatbot?.apiKeyGemini ? '[tersimpan]' : '',
  };
}

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
  chatbot?: ChatbotPublicSettings;
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
