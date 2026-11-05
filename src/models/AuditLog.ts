import mongoose, { Schema, model, models, type InferSchemaType } from 'mongoose';

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    email: { type: String, default: '' },
    aksi: { type: String, required: true }, // 'create' | 'update' | 'delete' | 'login' | 'logout' | 'upload'
    entitas: { type: String, required: true }, // 'JalurSeleksi' etc
    entitasId: { type: String, default: '' },
    ringkasan: { type: String, default: '' },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

AuditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditLog =
  (models.AuditLog as mongoose.Model<AuditLogDoc> | undefined) ||
  model<AuditLogDoc>('AuditLog', AuditLogSchema);

// Pengaman terakhir (FR-23, FR-29): log tidak pernah memuat password, token, secret, hash, atau kode
// pemulihan, apa pun yang dikirim pemanggil. Nilai string/objek/array pada kunci sensitif diganti;
// penanda boolean/angka (mis. `tokenInstagramDiubah`, `sisaKodePemulihan`) dibiarkan.
const KUNCI_SENSITIF = /pass(word)?|secret|token|hash|rahasia|api.?key|kode.?pemulihan/i;
const DISAMARKAN = '[disamarkan]';

export function redaksiLog(nilai: unknown, kedalaman = 0): unknown {
  if (kedalaman > 8 || nilai === null || typeof nilai !== 'object') return nilai;
  if (nilai instanceof Date || nilai instanceof mongoose.Types.ObjectId) return nilai;
  if (Array.isArray(nilai)) return nilai.map((v) => redaksiLog(v, kedalaman + 1));
  const sumber = typeof (nilai as { toObject?: unknown }).toObject === 'function'
    ? ((nilai as { toObject: () => Record<string, unknown> }).toObject())
    : (nilai as Record<string, unknown>);
  const hasil: Record<string, unknown> = {};
  for (const [kunci, v] of Object.entries(sumber)) {
    const sensitif = KUNCI_SENSITIF.test(kunci) && typeof v !== 'boolean' && typeof v !== 'number';
    hasil[kunci] = sensitif ? (v ? DISAMARKAN : v) : redaksiLog(v, kedalaman + 1);
  }
  return hasil;
}

export async function writeAuditLog(input: {
  userId?: string | mongoose.Types.ObjectId;
  email?: string;
  aksi: string;
  entitas: string;
  entitasId?: string;
  ringkasan?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await AuditLog.create({ ...input, before: redaksiLog(input.before), after: redaksiLog(input.after) });
  } catch (error) {
    // Log tidak boleh memutus alur permintaan, tetapi kegagalannya harus terlihat di log server (FR-29).
    // Hanya aksi, entitas, dan jenis galat; isi before/after tidak dicetak.
    console.error('[audit] gagal menulis log:', input.aksi, input.entitas, error instanceof Error ? error.name : 'unknown');
  }
}
