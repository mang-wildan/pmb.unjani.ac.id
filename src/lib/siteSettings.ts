import 'server-only';
import { cache } from 'react';
import { connectDb } from '@/lib/db';
import { chatbotUntukPublik, getSettings } from '@/models/Settings';

export const loadSiteSettings = cache(async () => {
  await connectDb().catch(() => null);
  const settings = await getSettings().catch(() => null);
  if (!settings) return null;
  // Daftar izin eksplisit: jangan sebarkan dokumen Settings yang memuat kredensial ke publik.
  return {
    siteName: settings.siteName,
    tagline: settings.tagline,
    urlPendaftaran: settings.urlPendaftaran,
    alamat: settings.alamat,
    email: settings.email,
    telepon: settings.telepon,
    whatsapp: settings.whatsapp,
    sosmed: settings.sosmed?.map(({ nama, url, ikon }) => ({ nama, url, ikon })),
    googleAnalyticsId: settings.googleAnalyticsId,
    googleSiteVerification: settings.googleSiteVerification,
    defaultMetaTitle: settings.defaultMetaTitle,
    defaultMetaDescription: settings.defaultMetaDescription,
    ogImage: settings.ogImage,
    // Diperlukan Server Component (mis. feed Instagram di beranda). Tidak pernah diekspos
    // ke browser karena layout publik hanya meneruskan `publicSettings` yang dibatasi.
    instagramAccessToken: settings.instagramAccessToken,
    instagramFeedAktif: settings.instagramFeedAktif,
    chatbot: {
      ...chatbotUntukPublik(settings.chatbot),
      whatsappUrl: settings.whatsapp?.replace(/\D/g, '')
        ? `https://wa.me/${settings.whatsapp.replace(/\D/g, '').replace(/^0/, '62')}`
        : null,
    },
  };
});
