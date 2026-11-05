import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { Settings, getSettings, type SettingsDoc } from '@/models/Settings';
import { requireAdmin } from '@/lib/adminGuard';
import { writeAuditLog } from '@/models/AuditLog';
import { isValidGoogleAnalyticsId } from '@/lib/seo';
import { urlHttp, urlHttpOpsional } from '@/lib/validation';
import { samarkan, tidakBerubah } from '@/lib/rahasiaSamar';

export const runtime = 'nodejs';

const schema = z.object({
  siteName: z.string().min(2).max(120).optional(),
  tagline: z.string().max(220).optional(),
  urlPendaftaran: urlHttp.optional(),
  alamat: z.string().max(300).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  telepon: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  sosmed: z
    .array(
      z.object({
        nama: z.string().min(1).max(50),
        url: urlHttp,
        ikon: z.string().max(40).optional(),
      }),
    )
    .optional(),
  googleAnalyticsId: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidGoogleAnalyticsId(v), {
      message: 'Format ID Google Analytics tidak valid (contoh: G-XXXXXXXXXX)',
    })
    .optional(),
  googleSiteVerification: z.string().max(120).optional(),
  defaultMetaTitle: z.string().max(120).optional(),
  defaultMetaDescription: z.string().max(300).optional(),
  ogImage: urlHttpOpsional.optional(),
  // Secret: kosong atau bentuk tersamar (••••1234) berarti "tidak berubah" (FR-23).
  instagramAccessToken: z.string().max(1000).optional(),
  instagramFeedAktif: z.boolean().optional(),
  recaptcha: z
    .object({
      aktif: z.boolean().optional(),
      siteKey: z.string().max(200).optional(),
      secretKey: z.string().max(200).optional(),
    })
    .optional(),
});

/** Salinan Settings untuk klien: secret tersamar, tidak pernah utuh (FR-23). */
function untukKlien(doc: SettingsDoc) {
  return {
    ...doc,
    instagramAccessToken: samarkan(doc.instagramAccessToken),
    instagramAccessTokenTerisi: Boolean(doc.instagramAccessToken),
    recaptcha: {
      ...doc.recaptcha,
      secretKey: samarkan(doc.recaptcha?.secretKey),
      secretKeyTerisi: Boolean(doc.recaptcha?.secretKey),
    },
  };
}

/** Salinan untuk log audit: tanpa secret sama sekali, bahkan tersamar (FR-23 AC3). */
function untukAudit(doc: SettingsDoc) {
  return {
    ...doc,
    instagramAccessToken: doc.instagramAccessToken ? '[tersimpan]' : '',
    recaptcha: { ...doc.recaptcha, secretKey: doc.recaptcha?.secretKey ? '[tersimpan]' : '' },
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req, 'editor');
  if ('error' in guard) return guard.error;
  await connectDb();
  const item = await getSettings();
  return NextResponse.json({ item: untukKlien(item) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin(req, 'admin');
  if ('error' in guard) return guard.error;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const pesanUrl = parsed.error.issues.find((i) => i.message.startsWith('URL'));
    return NextResponse.json(
      { error: pesanUrl ? pesanUrl.message : 'Data tidak valid', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { recaptcha, instagramAccessToken, ...lain } = parsed.data;
  await connectDb();
  const before = await getSettings();

  // Secret baru hanya bila klien mengirim nilai yang bukan kosong dan bukan bentuk tersamar.
  const secretBaru = recaptcha && !tidakBerubah(recaptcha.secretKey) ? (recaptcha.secretKey ?? '').trim() : null;
  const tokenBaru = instagramAccessToken !== undefined && !tidakBerubah(instagramAccessToken) ? instagramAccessToken.trim() : null;

  // reCAPTCHA aktif tanpa kunci akan mengunci login saat captcha wajib (FR-04).
  if (recaptcha) {
    const aktif = recaptcha.aktif ?? before.recaptcha?.aktif;
    const siteKey = (recaptcha.siteKey ?? before.recaptcha?.siteKey ?? '').trim();
    const secretKey = secretBaru ?? before.recaptcha?.secretKey ?? '';
    if (aktif === true && !siteKey) {
      return NextResponse.json({ error: 'Site key wajib diisi bila reCAPTCHA aktif' }, { status: 400 });
    }
    if (aktif === true && !secretKey) {
      return NextResponse.json({ error: 'Secret key wajib diisi bila reCAPTCHA aktif' }, { status: 400 });
    }
  }

  const set: Record<string, unknown> = { ...lain, updatedBy: guard.session.sub };
  if (recaptcha?.aktif !== undefined) set['recaptcha.aktif'] = recaptcha.aktif;
  if (recaptcha?.siteKey !== undefined) set['recaptcha.siteKey'] = recaptcha.siteKey.trim();
  if (secretBaru !== null) set['recaptcha.secretKey'] = secretBaru;
  if (tokenBaru !== null) set.instagramAccessToken = tokenBaru;

  const updated = await Settings.findOneAndUpdate({ singleton: 'main' }, { $set: set }, { upsert: true, new: true }).lean<SettingsDoc>();
  await writeAuditLog({
    userId: guard.session.sub,
    email: guard.session.email,
    aksi: 'update',
    entitas: 'Settings',
    entitasId: 'main',
    ringkasan: 'Ubah pengaturan situs',
    before: untukAudit(before),
    after: {
      ...untukAudit(updated),
      secretRecaptchaDiubah: secretBaru !== null,
      tokenInstagramDiubah: tokenBaru !== null,
    },
  });
  return NextResponse.json({ item: untukKlien(updated) }, { headers: { 'Cache-Control': 'no-store' } });
}
