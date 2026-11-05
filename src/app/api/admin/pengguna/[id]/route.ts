import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { AdminUser } from '@/models/AdminUser';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { passwordBaru, pesanGalat } from '@/lib/passwordPolicy';

export const runtime = 'nodejs';

const schema = z.object({
  nama: z.string().min(2).max(120).optional(),
  role: z.enum(['superadmin', 'admin', 'editor']).optional(),
  aktif: z.boolean().optional(),
  password: passwordBaru.optional(),
});

const PESAN_SUPERADMIN_TERAKHIR = 'Superadmin aktif terakhir tidak dapat diturunkan, dinonaktifkan, atau dihapus';
const PESAN_BERSAMAAN = 'Perubahan bersamaan terdeteksi; superadmin aktif terakhir dipertahankan. Coba lagi.';

type Snapshot = { email: string; nama: string; role: string; aktif?: boolean | null };

/** Data untuk log audit: tanpa password/hash/rahasia (FR-29). */
function auditView(u: Snapshot) {
  return { email: u.email, nama: u.nama, role: u.role, aktif: u.aktif };
}

function superadminAktif(u: Snapshot) {
  return u.role === 'superadmin' && u.aktif === true;
}

async function adaSuperadminAktifLain(id: string) {
  return (await AdminUser.countDocuments({ role: 'superadmin', aktif: true, _id: { $ne: id } })) > 0;
}

async function jumlahSuperadminAktif() {
  return AdminUser.countDocuments({ role: 'superadmin', aktif: true });
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'superadmin');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: pesanGalat(parsed.error.issues), details: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  await connectDb();
  const before = await AdminUser.findById(id).lean();
  if (!before) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  // FR-16: superadmin aktif terakhir tidak boleh diturunkan atau dinonaktifkan.
  const melepasSuperadmin =
    superadminAktif(before) &&
    ((data.role !== undefined && data.role !== 'superadmin') || data.aktif === false);
  if (melepasSuperadmin && !(await adaSuperadminAktifLain(id))) {
    return NextResponse.json({ error: PESAN_SUPERADMIN_TERAKHIR }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  if (data.nama !== undefined) set.nama = data.nama;
  if (data.role !== undefined) set.role = data.role;
  if (data.aktif !== undefined) set.aktif = data.aktif;
  if (data.password) set.passwordHash = await AdminUser.hashPassword(data.password);
  if (Object.keys(set).length === 0) return NextResponse.json({ item: before });

  // FR-11: perubahan role, status aktif, atau password mencabut semua sesi akun tersebut.
  const cabutSesi =
    (data.role !== undefined && data.role !== before.role) ||
    (data.aktif !== undefined && data.aktif !== before.aktif) ||
    Boolean(data.password);
  const update = cabutSesi ? { $set: set, $inc: { versiSesi: 1 } } : { $set: set };
  const updated = await AdminUser.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

  // Dua superadmin bisa saling menurunkan pada saat bersamaan; periksa ulang setelah menulis.
  if (melepasSuperadmin && (await jumlahSuperadminAktif()) === 0) {
    await AdminUser.updateOne({ _id: id }, { $set: { role: before.role, aktif: before.aktif } });
    return NextResponse.json({ error: PESAN_BERSAMAAN }, { status: 409 });
  }

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'AdminUser',
    entitasId: id,
    ringkasan: `Ubah pengguna: ${updated.email}${cabutSesi ? ' (sesi dicabut)' : ''}`,
    before: auditView(before),
    after: { ...auditView(updated), passwordDiubah: Boolean(data.password), sesiDicabut: cabutSesi },
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const guard = await requireAdmin(req, 'superadmin');
  if ('error' in guard) return guard.error;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 });
  if (id === guard.session.sub) {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 });
  }
  await connectDb();
  const target = await AdminUser.findById(id).lean();
  if (!target) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  if (superadminAktif(target) && !(await adaSuperadminAktifLain(id))) {
    return NextResponse.json({ error: PESAN_SUPERADMIN_TERAKHIR }, { status: 400 });
  }
  // Ambil dokumen lengkap (termasuk field select:false) agar bisa dikembalikan utuh bila perlu.
  const removed = await AdminUser.findByIdAndDelete(id)
    .select('+passwordHash +mfaRahasia +mfaKodePemulihan')
    .lean();
  if (!removed) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
  if (superadminAktif(target) && (await jumlahSuperadminAktif()) === 0) {
    await AdminUser.collection.insertOne(removed);
    return NextResponse.json({ error: PESAN_BERSAMAAN }, { status: 409 });
  }
  // Akun terhapus otomatis kehilangan semua sesinya (session.ts menolak akun yang tidak ada).
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'delete',
    entitas: 'AdminUser',
    entitasId: id,
    ringkasan: `Hapus pengguna: ${removed.email}`,
    before: auditView(target),
  });
  return NextResponse.json({ ok: true });
}
