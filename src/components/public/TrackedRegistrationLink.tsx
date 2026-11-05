'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { ANALYTICS_EVENTS, sendAnalyticsEvent } from '@/lib/analytics';

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'onClick'> & {
  href: string;
  location: 'hero' | 'floating';
};

export function appendUtmParameters(href: string, pageSearch: string): string {
  const utmEntries = [...new URLSearchParams(pageSearch)].filter(([key]) =>
    key.startsWith('utm_'),
  );
  if (!utmEntries.length) return href;

  const target = new URL(href);
  for (const [key, value] of utmEntries) {
    target.searchParams.set(key, value);
  }
  return target.toString();
}

export default function TrackedRegistrationLink({ href, location, ...props }: Props) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        sendAnalyticsEvent(ANALYTICS_EVENTS.ctaDaftarClick, { location });
        try {
          event.currentTarget.href = appendUtmParameters(href, window.location.search);
        } catch {
          // URL dasar tetap dipakai bila parameter tidak dapat diproses.
        }
      }}
    />
  );
}
