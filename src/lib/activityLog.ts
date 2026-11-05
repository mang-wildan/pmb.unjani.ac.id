export type ActivityPeriod = 'all' | 'day' | 'week' | 'month' | 'year';

export const ACTIVITY_PERIOD_OPTIONS: ActivityPeriod[] = ['all', 'day', 'week', 'month', 'year'];
export const ACTIVITY_REPORT_PERIOD_OPTIONS: Exclude<ActivityPeriod, 'all'>[] = ['day', 'week', 'month', 'year'];

export function isActivityPeriod(value: string | null | undefined): value is ActivityPeriod {
  return Boolean(value && ACTIVITY_PERIOD_OPTIONS.includes(value as ActivityPeriod));
}

export function isActivityReportPeriod(value: string | null | undefined): value is Exclude<ActivityPeriod, 'all'> {
  return Boolean(value && ACTIVITY_REPORT_PERIOD_OPTIONS.includes(value as Exclude<ActivityPeriod, 'all'>));
}

export function getPeriodLabel(period: ActivityPeriod) {
  switch (period) {
    case 'day':
      return 'Hari Ini';
    case 'week':
      return 'Minggu Ini';
    case 'month':
      return 'Bulan Ini';
    case 'year':
      return 'Tahun Ini';
    default:
      return 'Semua Periode';
  }
}

export function getPeriodRange(period: Exclude<ActivityPeriod, 'all'>, now = new Date()) {
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    return { start, end, label: getPeriodLabel(period) };
  }

  if (period === 'week') {
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end, label: getPeriodLabel(period) };
  }

  if (period === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
    end.setHours(0, 0, 0, 0);
    return { start, end, label: getPeriodLabel(period) };
  }

  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  end.setFullYear(start.getFullYear() + 1, 0, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end, label: getPeriodLabel(period) };
}

export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
