import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Dokumen } from '@/models/Dokumen';
import { requireAdmin } from '@/lib/adminGuard';

export const runtime = 'nodejs';

const listQuery = z.object({
  kategori: z.enum(['biaya', 'manual-book', 'lainnya']).optional(),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  const url = new URL(req.url);
  const parsed = listQuery.safeParse({ kategori: url.searchParams.get('kategori') || undefined });
  if (!parsed.success) return NextResponse.json({ error: 'Query tidak valid' }, { status: 400 });
  await connectDb();
  const query = parsed.data.kategori ? { kategori: parsed.data.kategori } : {};
  const items = await Dokumen.find(query).sort({ urutan: 1, updatedAt: -1 }).lean();
  return NextResponse.json({ items });
}
