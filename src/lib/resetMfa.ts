import { AdminUser } from '@/models/AdminUser';

// Reset MFA satu akun (FR-09, TBD-07): dipakai API superadmin dan scripts/reset-mfa.ts agar
// efeknya identik. Semua data MFA dikosongkan dan versiSesi dinaikkan, sehingga semua sesi
// akun berakhir dan login berikutnya wajib mendaftar ulang. Pemanggil wajib connectDb() dulu.

export type HasilResetMfa = {
  id: string;
  email: string;
  sebelum: { mfaAktif: boolean; mfaDiaktifkanPada: Date | null; sisaKodePemulihan: number };
};

/** Null bila akun tidak ditemukan. */
export async function resetMfaAkun(filter: { _id: string } | { email: string }): Promise<HasilResetMfa | null> {
  const before = await AdminUser.findOneAndUpdate(
    filter,
    {
      $set: {
        mfaAktif: false,
        mfaRahasia: '',
        mfaKodePemulihan: [],
        mfaPeriodeTerakhir: null,
        mfaDiaktifkanPada: null,
      },
      $inc: { versiSesi: 1 },
    },
    { new: false },
  )
    .select('email mfaAktif mfaDiaktifkanPada +mfaKodePemulihan')
    .lean();
  if (!before) return null;
  return {
    id: String(before._id),
    email: before.email,
    sebelum: {
      mfaAktif: before.mfaAktif === true,
      mfaDiaktifkanPada: before.mfaDiaktifkanPada ?? null,
      sisaKodePemulihan: before.mfaKodePemulihan?.length ?? 0,
    },
  };
}
