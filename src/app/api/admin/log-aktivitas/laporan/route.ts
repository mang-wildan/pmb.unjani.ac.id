import { NextResponse, type NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { requireAdmin } from '@/lib/adminGuard';
import { AuditLog } from '@/models/AuditLog';
import { getPeriodRange, isActivityReportPeriod, type ActivityPeriod } from '@/lib/activityLog';

export const runtime = 'nodejs';

type AggregateCount = {
  _id: string;
  count: number;
};

type AuditLogItem = {
  createdAt?: Date | string;
};

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;

  const periodParam = req.nextUrl.searchParams.get('period');
  const period = isActivityReportPeriod(periodParam)
    ? periodParam
    : 'month';

  await connectDb();

  const now = new Date();
  const periods: Exclude<ActivityPeriod, 'all'>[] = ['day', 'week', 'month', 'year'];
  const selected = getPeriodRange(period, now);
  const selectedMatch = { createdAt: { $gte: selected.start, $lt: selected.end } };

  const [
    cardCounts,
    total,
    uniqueUsers,
    latestActivity,
    actionBreakdown,
    entityBreakdown,
  ] = await Promise.all([
    Promise.all(
      periods.map(async (key) => {
        const range = getPeriodRange(key, now);
        const count = await AuditLog.countDocuments({ createdAt: { $gte: range.start, $lt: range.end } });
        return { key, label: range.label, count };
      }),
    ),
    AuditLog.countDocuments(selectedMatch),
    AuditLog.distinct('email', selectedMatch),
    AuditLog.findOne(selectedMatch).sort({ createdAt: -1 }).lean(),
    AuditLog.aggregate<AggregateCount>([
      { $match: selectedMatch },
      { $group: { _id: '$aksi', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    AuditLog.aggregate<AggregateCount>([
      { $match: selectedMatch },
      { $group: { _id: '$entitas', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
  ]);

  const metrics = {
    login: 0,
    logout: 0,
    create: 0,
    update: 0,
    delete: 0,
    upload: 0,
  };

  for (const row of actionBreakdown) {
    if (row._id in metrics) {
      metrics[row._id as keyof typeof metrics] = row.count;
    }
  }

  return NextResponse.json({
    cards: cardCounts,
    selectedPeriod: {
      key: period,
      label: selected.label,
      start: selected.start,
      end: selected.end,
      total,
      uniqueUsers: (uniqueUsers as string[]).filter(Boolean).length,
      latestActivityAt: (latestActivity as AuditLogItem | null)?.createdAt ?? null,
      metrics,
      actions: actionBreakdown.map((row) => ({
        label: row._id || 'Tanpa aksi',
        count: row.count,
      })),
      entities: entityBreakdown.map((row) => ({
        label: row._id || 'Tanpa entitas',
        count: row.count,
      })),
    },
  });
}
