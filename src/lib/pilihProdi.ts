// Kontrak event window antara kartu program studi dan kalkulator biaya (FR-46, Keputusan Teknis
// #18): tombol "Hitung biaya" mengirim event ini, KalkulatorForm mendengarkan dan memilih prodi.

export const EVENT_PILIH_PRODI = 'pmb:pilih-prodi';

export type PilihProdiDetail = { prodiId: string };

export function kirimPilihProdi(prodiId: string): void {
  window.dispatchEvent(new CustomEvent<PilihProdiDetail>(EVENT_PILIH_PRODI, { detail: { prodiId } }));
}
