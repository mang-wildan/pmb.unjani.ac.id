import type { Metadata } from 'next';
import Navbar from '@/components/public/Navbar';
import Footer from '@/components/public/Footer';
import WhatsAppFloatingButton from '@/components/public/WhatsAppFloatingButton';
import DaftarFloatingButton from '@/components/public/DaftarFloatingButton';
import { loadSiteSettings } from '@/lib/siteSettings';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSiteSettings();
  const googleVerification =
    settings?.googleSiteVerification?.trim() || process.env.GOOGLE_SITE_VERIFICATION?.trim();

  return googleVerification
    ? {
        verification: {
          google: googleVerification,
        },
      }
    : {};
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSiteSettings();
  const publicSettings = settings
    ? {
        tagline: settings.tagline,
        urlPendaftaran: settings.urlPendaftaran,
        alamat: settings.alamat,
        email: settings.email,
        telepon: settings.telepon,
        whatsapp: settings.whatsapp,
        sosmed: settings.sosmed?.map((item) => ({
          nama: item.nama,
          url: item.url,
          ikon: item.ikon,
        })),
      }
    : null;

  return (
    <>
      <Navbar settings={publicSettings} />
      <main id="main">{children}</main>
      <Footer settings={publicSettings} />
      <DaftarFloatingButton url={publicSettings?.urlPendaftaran || 'https://pendaftaran.unjani.ac.id/loginnew'} />
      <WhatsAppFloatingButton />
    </>
  );
}
