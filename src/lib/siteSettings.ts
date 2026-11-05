import { cache } from 'react';
import { connectDb } from '@/lib/db';
import { getSettings } from '@/models/Settings';

export const loadSiteSettings = cache(async () => {
  await connectDb().catch(() => null);
  return getSettings().catch(() => null);
});
