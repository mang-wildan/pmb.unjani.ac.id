import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { getSettings } from '@/models/Settings';

export const runtime = 'nodejs';

// Public endpoint — only exposes non-sensitive config needed by the login page.
// secretKey is never returned here.
export async function GET() {
  await connectDb();
  const settings = await getSettings();
  const rc = settings.recaptcha as { aktif?: boolean; siteKey?: string } | undefined;
  return NextResponse.json({
    recaptcha: {
      aktif: rc?.aktif ?? false,
      siteKey: rc?.aktif ? (rc?.siteKey ?? '') : '',
    },
  });
}
