// Penyamaran secret pihak ketiga (FR-23): secret reCAPTCHA dan token Instagram tidak pernah
// dikirim utuh ke browser. Klien menerima bentuk tersamar; mengirim kembali nilai kosong atau
// nilai tersamar berarti "tidak berubah".

const TITIK = '••••';

/** Bentuk tersamar: `••••` + 4 karakter terakhir; secret pendek (≤ 8) tidak membuka satu karakter pun. */
export function samarkan(nilai: string | null | undefined): string {
  const v = nilai ?? '';
  if (!v) return '';
  return v.length > 8 ? `${TITIK}${v.slice(-4)}` : TITIK;
}

/** Apakah masukan klien menandakan "jangan ubah": kosong, atau bentuk tersamar dari server. */
export function tidakBerubah(masukan: string | null | undefined): boolean {
  const v = (masukan ?? '').trim();
  return v === '' || v.startsWith(TITIK);
}
