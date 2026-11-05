import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { AuditLog, redaksiLog } from '@/models/AuditLog';
import { escapeRegex, getPeriodLabel, getPeriodRange, isActivityPeriod, type ActivityPeriod } from '@/lib/activityLog';

export const runtime = 'nodejs';

type AuditLogItem = {
  _id: unknown;
  createdAt?: Date | string;
  email?: string;
  aksi?: string;
  entitas?: string;
  entitasId?: string;
  ringkasan?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
};

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '15') || 15));
  const q = searchParams.get('q')?.trim() || '';
  const aksi = searchParams.get('aksi')?.trim() || '';
  const entitas = searchParams.get('entitas')?.trim() || '';
  const period: ActivityPeriod = isActivityPeriod(searchParams.get('period')) ? searchParams.get('period') as ActivityPeriod : 'all';

  const filter: Record<string, unknown> = {};

  if (period !== 'all') {
    const range = getPeriodRange(period);
    filter.createdAt = { $gte: range.start, $lt: range.end };
  }

  if (aksi) filter.aksi = aksi;
  if (entitas) filter.entitas = entitas;

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { email: regex },
      { aksi: regex },
      { entitas: regex },
      { entitasId: regex },
      { ringkasan: regex },
      { ip: regex },
    ];
  }

  await connectDb();

  const [items, total, aksiOptions, entitasOptions] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
    AuditLog.distinct('aksi'),
    AuditLog.distinct('entitas'),
  ]);

  return NextResponse.json({
    items: (items as AuditLogItem[]).map((item) => ({
      _id: String(item._id),
      createdAt: item.createdAt ?? null,
      email: item.email || '',
      aksi: item.aksi || '',
      entitas: item.entitas || '',
      entitasId: item.entitasId || '',
      ringkasan: item.ringkasan || '',
      // Redaksi juga saat dibaca: entri lama (sebelum FR-23) mungkin masih memuat secret.
      before: redaksiLog(item.before ?? null),
      after: redaksiLog(item.after ?? null),
      ip: item.ip || '',
      userAgent: item.userAgent || '',
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      period,
      periodLabel: getPeriodLabel(period),
      aksiOptions: (aksiOptions as string[]).filter(Boolean).sort(),
      entitasOptions: (entitasOptions as string[]).filter(Boolean).sort(),
    },
  });
}
