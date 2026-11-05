// Deklarasi tipe minimal untuk paket `qrcode` (PLAN D4, keputusan 7): hanya fungsi yang dipakai
// pendaftaran MFA, agar tidak perlu dependency `@types/qrcode`.
declare module 'qrcode' {
  export type QRCodeToDataURLOptions = {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    color?: { dark?: string; light?: string };
  };

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;

  const QRCode: { toDataURL: typeof toDataURL };
  export default QRCode;
}
