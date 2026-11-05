import { type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ProgramStudi } from '@/models/ProgramStudi';
import '@/models/Jenjang';
import '@/models/Fakultas';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';
import { csvCell } from '@/lib/csv';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  await connectDb();

  const items = await ProgramStudi.find()
    .populate('jenjang_id', 'singkatan')
    .populate('fakultas_id', 'singkatan')
    .sort({ nama: 1 })
    .lean();

  const header = ['nama', 'singkatan', 'jenjang', 'fakultas', 'akreditasi', 'persyaratan'];

  const rows = items.map((item) => {
    const jenjang = item.jenjang_id as { singkatan?: string } | null;
    const fakultas = item.fakultas_id as { singkatan?: string } | null;
    const persyaratan = Array.isArray(item.persyaratan) ? item.persyaratan.join('|') : '';

    return [
      item.nama,
      item.singkatan,
      jenjang?.singkatan ?? '',
      fakultas?.singkatan ?? '',
      item.akreditasi ?? '',
      persyaratan,
    ].map(csvCell).join(',');
  });

  const csv = ['﻿' + header.join(','), ...rows].join('\r\n');

  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'export',
    entitas: 'ProgramStudi',
    entitasId: 'all',
    ringkasan: `Export CSV ${items.length} program studi`,
    after: { total: items.length, format: 'csv' },
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get('user-agent') || '',
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="export-program-studi.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
