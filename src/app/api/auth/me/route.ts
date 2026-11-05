import { NextResponse } from 'next/server';
import { getActiveSession, SessionUnavailableError } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  let session;
  try {
    session = await getActiveSession();
  } catch (error) {
    if (error instanceof SessionUnavailableError) {
      return NextResponse.json({ error: 'Layanan sedang tidak tersedia' }, { status: 503 });
    }
    throw error;
  }
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: { id: session.sub, email: session.email, nama: session.nama, role: session.role },
  });
}
