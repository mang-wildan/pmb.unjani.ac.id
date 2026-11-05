import { type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { Biaya } from '@/models/Biaya';
import '@/models/Jadwal';
import '@/models/JalurSeleksi';
import '@/models/Kelas';
import '@/models/ProgramStudi';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';
import { csvCell } from '@/lib/csv';

export const runtime = 'nodejs';

function filenamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  const jadwalId = req.nextUrl.searchParams.get('jadwal_id')?.trim();
  if (!jadwalId) {
    return Response.json({ error: 'Gelombang wajib dipilih' }, { status: 400 });
  }
  if (!mongoose.isValidObjectId(jadwalId)) {
    return Response.json({ error: 'Gelombang tidak valid' }, { status: 400 });
  }

  await connectDb();

  const items = await Biaya.find({ jadwal_id: jadwalId })
    .populate('programStudi_id', 'singkatan')
    .populate('jalur_id', 'nama')
    .populate('jadwal_id', 'judul tahun ke')
    .populate('kelas_id', 'nama singkatan')
    .lean();

  if (items.length === 0) {
    return Response.json({ error: 'Tidak ada data biaya untuk gelombang yang dipilih' }, { status: 404 });
  }

  const jadwal = items[0].jadwal_id as { judul?: string; tahun?: string; ke?: number } | null;
  const header = [
    'program_studi',
    'jalur',
    'kelas',
    'tahun_ajaran',
    'judul_jadwal',
    'biaya',
    'biaya_per_semester',
    'biaya_tambahan',
    'persentase',
  ];

  const sortedItems = [...items].sort((a, b) => {
    const aProgram = ((a.programStudi_id as { singkatan?: string } | null)?.singkatan || '').toLowerCase();
    const bProgram = ((b.programStudi_id as { singkatan?: string } | null)?.singkatan || '').toLowerCase();
    if (aProgram !== bProgram) return aProgram.localeCompare(bProgram);

    const aJalur = ((a.jalur_id as { nama?: string } | null)?.nama || '').toLowerCase();
    const bJalur = ((b.jalur_id as { nama?: string } | null)?.nama || '').toLowerCase();
    if (aJalur !== bJalur) return aJalur.localeCompare(bJalur);

    const aKelas = ((a.kelas_id as { singkatan?: string; nama?: string } | null)?.singkatan
      || (a.kelas_id as { singkatan?: string; nama?: string } | null)?.nama
      || '').toLowerCase();
    const bKelas = ((b.kelas_id as { singkatan?: string; nama?: string } | null)?.singkatan
      || (b.kelas_id as { singkatan?: string; nama?: string } | null)?.nama
      || '').toLowerCase();
    return aKelas.localeCompare(bKelas);
  });

  const rows = sortedItems.map((item) => {
    const programStudi = item.programStudi_id as { singkatan?: string } | null;
    const jalur = item.jalur_id as { nama?: string } | null;
    const kelas = item.kelas_id as { singkatan?: string; nama?: string } | null;
    const persentase = Array.isArray(item.persentase) && item.persentase.length > 0 ? item.persentase.join('|') : '100%';

    return [
      programStudi?.singkatan ?? '',
      jalur?.nama ?? '',
      kelas?.singkatan || kelas?.nama || '',
      jadwal?.tahun ?? '',
      jadwal?.judul ?? '',
      item.biaya ?? 0,
      item.biayaPerSemester ?? '',
      item.biayaTambahan ?? '',
      persentase,
    ].map(csvCell).join(',');
  });

  const csv = ['\uFEFF' + header.join(','), ...rows].join('\r\n');
  const fileSuffix = [jadwal?.tahun, jadwal?.judul].filter(Boolean).map((v) => filenamePart(String(v))).join('-') || 'biaya';

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'export',
    entitas: 'Biaya',
    entitasId: jadwalId,
    ringkasan: `Export CSV biaya untuk ${jadwal?.judul ?? 'jadwal'} ${jadwal?.tahun ?? ''}`.trim(),
    after: { jadwal_id: jadwalId, total: items.length, format: 'csv' },
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="biaya-${fileSuffix}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
