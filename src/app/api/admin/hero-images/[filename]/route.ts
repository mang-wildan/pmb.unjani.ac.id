import { NextResponse, type NextRequest } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { clientIpFromHeaders } from '@/lib/http';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public/uploads/hero');

export async function DELETE(req: NextRequest, props: { params: Promise<{ filename: string }> }) {
  const { filename } = await props.params;
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;

  try {
    // Safety: prevent path traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return NextResponse.json(
        { error: 'Filename tidak valid' },
        { status: 400 }
      );
    }

    const filepath = path.join(UPLOAD_DIR, filename);

    // Verify file exists in upload dir
    if (!filepath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    await fs.unlink(filepath);

    await writeAuditLog({
      userId: guard.session.sub,
      email: guard.session.email,
      aksi: 'delete',
      entitas: 'HeroImage',
      entitasId: filename,
      ringkasan: `Hapus gambar hero: ${filename}`,
      before: { url: `/uploads/hero/${filename}` },
      ip: clientIpFromHeaders(req.headers),
      userAgent: (req.headers.get('user-agent') || '').slice(0, 300),
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 404 }
      );
    }

    console.error('Hero image delete error:', err);
    return NextResponse.json(
      { error: 'Gagal menghapus gambar' },
      { status: 500 }
    );
  }
}
