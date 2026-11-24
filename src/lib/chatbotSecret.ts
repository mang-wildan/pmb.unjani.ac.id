import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const PESAN_SETUP = 'Enkripsi chatbot belum dikonfigurasi. Hubungi pengelola server.';

export class ChatbotEncryptionConfigError extends Error {
  constructor() {
    super(PESAN_SETUP);
    this.name = 'ChatbotEncryptionConfigError';
  }
}

const PESAN_DEKRIPSI = 'Kunci chatbot tidak dapat dibaca. Hubungi pengelola server.';

export class ChatbotDecryptionError extends Error {
  constructor() {
    super(PESAN_DEKRIPSI);
    this.name = 'ChatbotDecryptionError';
  }
}

function kunci(): Buffer {
  const nilai = process.env.CHATBOT_ENCRYPTION_KEY;
  // Tepat 32 byte hex; jangan memakai secret autentikasi sebagai fallback.
  if (!nilai || !/^[a-fA-F0-9]{64}$/.test(nilai)) throw new ChatbotEncryptionConfigError();
  return Buffer.from(nilai, 'hex');
}

/** Format v1: IV 12 byte, tag 16 byte, ciphertext; seluruh komponen base64url. */
export function enkripsiChatbotSecret(plaintext: string): string {
  const key = kunci();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join(':');
}

/** Backend wajib menangani kegagalan dekripsi sebagai tidak tersedia, bukan memakai plaintext. */
export function dekripsiChatbotSecret(encrypted: string): string {
  const key = kunci();
  try {
    const bagian = encrypted.split(':');
    if (bagian.length !== 4 || bagian[0] !== 'v1') throw new Error();
    const [, iv, tag, ciphertext] = bagian.map((v, i) => i ? Buffer.from(v, 'base64url') : Buffer.alloc(0));
    if (iv.length !== 12 || tag.length !== 16) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Jangan sertakan nilai, ciphertext, atau error internal ke respons/log.
    throw new ChatbotDecryptionError();
  }
}
