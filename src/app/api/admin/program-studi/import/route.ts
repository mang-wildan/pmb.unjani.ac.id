import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ProgramStudi } from '@/models/ProgramStudi';
import { Fakultas } from '@/models/Fakultas';
import { Jenjang } from '@/models/Jenjang';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 1 * 1024 * 1024; // 1 MB

function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^﻿/, '');
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const row: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        row.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  const ct = req.headers.get('content-type') || '';
  if (!ct.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Content-Type harus multipart/form-data' }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File CSV wajib diunggah' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File melebihi 1 MB' }, { status: 400 });
  }

  const rows = parseCsv(await file.text());
  if (rows.length === 0) {
    return NextResponse.json({ error: 'File CSV kosong atau hanya berisi komentar' }, { status: 400 });
  }

  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const col = (name: string) => headers.indexOf(name);

  const missing = ['nama', 'singkatan', 'jenjang', 'fakultas'].filter((h) => col(h) === -1);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Header tidak lengkap. Kolom yang kurang: ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return NextResponse.json({ error: 'Tidak ada baris data untuk diimpor' }, { status: 400 });
  }

  await connectDb();
  const [allFakultas, allJenjang] = await Promise.all([
    Fakultas.find().lean(),
    Jenjang.find().lean(),
  ]);

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const row = dataRows[i];
    if (row.every((c) => !c)) continue;

    const get = (name: string) => (col(name) >= 0 ? (row[col(name)] ?? '').trim() : '');
    const nama = get('nama');
    const singkatan = get('singkatan').toUpperCase();
    const jenjangSingkatan = get('jenjang').toUpperCase();
    const fakultasSingkatan = get('fakultas').toUpperCase();
    const akreditasi = get('akreditasi');
    const persyaratanRaw = get('persyaratan');
    const persyaratan = persyaratanRaw
      ? persyaratanRaw.split('|').map((s) => s.trim()).filter(Boolean)
      : [];

    if (!nama) { errors.push({ row: rowNum, message: 'Kolom nama kosong' }); continue; }
    if (!singkatan) { errors.push({ row: rowNum, message: 'Kolom singkatan kosong' }); continue; }
    if (!jenjangSingkatan) { errors.push({ row: rowNum, message: 'Kolom jenjang kosong' }); continue; }
    if (!fakultasSingkatan) { errors.push({ row: rowNum, message: 'Kolom fakultas kosong' }); continue; }

    const jenjangDoc = allJenjang.find((j) => j.singkatan.toUpperCase() === jenjangSingkatan);
    if (!jenjangDoc) {
      const valid = allJenjang.map((j) => j.singkatan).join(', ');
      errors.push({ row: rowNum, message: `Jenjang "${jenjangSingkatan}" tidak ditemukan. Pilihan valid: ${valid || '(kosong — tambahkan jenjang dulu)'}` });
      continue;
    }

    const fakultas = allFakultas.find((f) => f.singkatan.toUpperCase() === fakultasSingkatan);
    if (!fakultas) {
      errors.push({ row: rowNum, message: `Fakultas "${fakultasSingkatan}" tidak ditemukan` });
      continue;
    }

    try {
      const res = await ProgramStudi.updateOne(
        { singkatan },
        {
          $setOnInsert: {
            nama,
            singkatan,
            jenjang_id: jenjangDoc._id,
            fakultas_id: fakultas._id,
            akreditasi: akreditasi || '',
            persyaratan,
            createdBy: guard.session.sub,
            updatedBy: guard.session.sub,
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount) {
        successCount++;
      } else {
        errors.push({ row: rowNum, message: `Singkatan "${singkatan}" sudah ada, dilewati` });
      }
    } catch {
      errors.push({ row: rowNum, message: 'Gagal menyimpan ke database' });
    }
  }

  if (successCount > 0) {
    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'create',
      entitas: 'ProgramStudi',
      entitasId: 'bulk-import',
      ringkasan: `Import ${successCount} data program studi dari CSV`,
      ip: clientIpFromHeaders(req.headers),
    });
  }

  return NextResponse.json({ success: successCount, errors });
}
