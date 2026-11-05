import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { Biaya } from '@/models/Biaya';
import { ProgramStudi } from '@/models/ProgramStudi';
import { JalurSeleksi } from '@/models/JalurSeleksi';
import { Kelas } from '@/models/Kelas';
import { Jadwal } from '@/models/Jadwal';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** Simple CSV parser — handles quoted fields and CRLF/LF. Skips comment lines (#). */
function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^﻿/, ''); // strip BOM
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

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : Math.max(0, n);
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
    return NextResponse.json({ error: 'File melebihi 2 MB' }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'File CSV kosong atau hanya berisi komentar' }, { status: 400 });
  }

  // First non-comment row = header
  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const col = (name: string) => headers.indexOf(name);

  const requiredHeaders = ['program_studi', 'jalur', 'tahun_ajaran', 'judul_jadwal', 'biaya'];
  const missing = requiredHeaders.filter((h) => col(h) === -1);
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

  // Load all lookup data once
  const [prodis, jalurs, kelases, jadwals] = await Promise.all([
    ProgramStudi.find().lean(),
    JalurSeleksi.find().lean(),
    Kelas.find().lean(),
    Jadwal.find().lean(),
  ]);

  const errors: { row: number; message: string }[] = [];
  let successCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2; // 1-based + skip header row
    const row = dataRows[i];

    if (row.every((c) => !c)) continue; // skip fully empty rows

    const get = (name: string) => (col(name) >= 0 ? (row[col(name)] ?? '').trim() : '');

    const prodiSingkatan = get('program_studi');
    const jalurNama = get('jalur');
    const kelasSingkatan = get('kelas');
    const tahunAjaran = get('tahun_ajaran');
    const judulJadwal = get('judul_jadwal');
    const biayaStr = get('biaya');
    const biayaPerSemesterStr = get('biaya_per_semester');
    const biayaTambahanStr = get('biaya_tambahan');
    const persentaseStr = get('persentase');

    // Validate required
    if (!prodiSingkatan) {
      errors.push({ row: rowNum, message: 'Kolom program_studi kosong' });
      continue;
    }
    if (!jalurNama) {
      errors.push({ row: rowNum, message: 'Kolom jalur kosong' });
      continue;
    }
    if (!biayaStr) {
      errors.push({ row: rowNum, message: 'Kolom biaya kosong' });
      continue;
    }

    // Lookup program studi
    const prodi = prodis.find(
      (p) => p.singkatan.toLowerCase() === prodiSingkatan.toLowerCase(),
    );
    if (!prodi) {
      errors.push({ row: rowNum, message: `Program studi "${prodiSingkatan}" tidak ditemukan` });
      continue;
    }

    // Lookup jalur
    const jalur = jalurs.find(
      (j) => j.nama.toLowerCase() === jalurNama.toLowerCase(),
    );
    if (!jalur) {
      errors.push({ row: rowNum, message: `Jalur "${jalurNama}" tidak ditemukan` });
      continue;
    }

    // Lookup kelas (optional)
    let kelasId: unknown = null;
    if (kelasSingkatan) {
      const kelas = kelases.find(
        (k) => k.singkatan.toLowerCase() === kelasSingkatan.toLowerCase(),
      );
      if (!kelas) {
        errors.push({ row: rowNum, message: `Kelas "${kelasSingkatan}" tidak ditemukan` });
        continue;
      }
      kelasId = kelas._id;
    }

    if (!tahunAjaran || !judulJadwal) {
      errors.push({
        row: rowNum,
        message: 'Kolom tahun_ajaran dan judul_jadwal wajib diisi',
      });
      continue;
    }

    const jadwal = jadwals.find(
      (j) =>
        (j as any).tahun === tahunAjaran &&
        j.judul.toLowerCase() === judulJadwal.toLowerCase(),
    );
    if (!jadwal) {
      errors.push({
        row: rowNum,
        message: `Jadwal "${judulJadwal}" (${tahunAjaran}) tidak ditemukan`,
      });
      continue;
    }
    const jadwalId = jadwal._id;

    // Parse numbers
    const biaya = parseNum(biayaStr);
    const biayaPerSemester = biayaPerSemesterStr ? parseNum(biayaPerSemesterStr) : undefined;
    const biayaTambahan = parseNum(biayaTambahanStr);
    const persentase = persentaseStr
      ? persentaseStr.split('|').map((s) => s.trim()).filter(Boolean)
      : ['100%'];

    if (!biayaStr.replace(/[^0-9]/g, '')) {
      errors.push({ row: rowNum, message: `Nilai biaya tidak valid: "${biayaStr}"` });
      continue;
    }

    try {
      await Biaya.create({
        programStudi_id: prodi._id,
        jalur_id: jalur._id,
        jadwal_id: jadwalId,
        kelas_id: kelasId,
        biaya,
        ...(biayaPerSemester !== undefined && { biayaPerSemester }),
        biayaTambahan,
        persentase,
        createdBy: guard.session.sub,
        updatedBy: guard.session.sub,
      });
      successCount++;
    } catch {
      errors.push({ row: rowNum, message: 'Gagal menyimpan ke database' });
    }
  }

  if (successCount > 0) {
    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'create',
      entitas: 'Biaya',
      entitasId: 'bulk-import',
      ringkasan: `Import ${successCount} data biaya dari CSV`,
      ip: clientIpFromHeaders(req.headers),
    });
  }

  return NextResponse.json({ success: successCount, errors });
}
