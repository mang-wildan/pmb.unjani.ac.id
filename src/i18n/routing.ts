import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['id', 'en'],
  defaultLocale: 'id',
  localePrefix: 'as-needed',
  // Bahasa dipilih lewat URL, bukan header Accept-Language (hindari 307 untuk crawler).
  localeDetection: false,
});
