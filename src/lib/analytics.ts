export const ANALYTICS_EVENTS = {
  ctaDaftarClick: 'pmb_cta_daftar_click',
  whatsappClick: 'pmb_whatsapp_click',
  documentDownload: 'pmb_document_download',
  calculatorSubmit: 'pmb_calculator_submit',
  articleClick: 'pmb_article_click',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: AnalyticsEventName,
      params?: AnalyticsEventParams,
    ) => void;
  }
}

export function sendAnalyticsEvent(
  eventName: AnalyticsEventName,
  params?: AnalyticsEventParams,
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  try {
    window.gtag('event', eventName, params);
  } catch {
    // Analytics tidak boleh menghambat tindakan utama pengguna.
  }
}
