import { ANALYTICS_EVENTS } from '@/lib/analytics';
import TrackedAnalyticsLink from './TrackedAnalyticsLink';

const WHATSAPP_MESSAGE =
  'Yth Ibu Yani, mohon bantuan informasi terkait Pendaftaran di Universitas Jenderal Achmad Yani. Nama Saya : ';

const WHATSAPP_URL = `https://wa.me/628112497890?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

export default function WhatsAppFloatingButton() {
  return (
    <TrackedAnalyticsLink
      href={WHATSAPP_URL}
      eventName={ANALYTICS_EVENTS.whatsappClick}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hubungi PMB melalui WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#25D366_0%,#1ea952_100%)] shadow-[0_18px_45px_rgba(37,211,102,0.32)] ring-1 ring-black/5 transition-transform duration-200 hover:scale-105 hover:shadow-[0_22px_52px_rgba(37,211,102,0.38)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/25"
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),transparent_38%)]"
      />
      <span className="sr-only">Hubungi PMB melalui WhatsApp</span>
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/12">
        <i className="fa-brands fa-whatsapp text-[2rem] leading-none text-white" aria-hidden="true" />
      </span>
    </TrackedAnalyticsLink>
  );
}
