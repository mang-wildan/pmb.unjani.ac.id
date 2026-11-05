'use client';

import type { ComponentPropsWithoutRef } from 'react';
import {
  sendAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventParams,
} from '@/lib/analytics';

type Props = Omit<ComponentPropsWithoutRef<'a'>, 'onClick'> & {
  eventName: AnalyticsEventName;
  eventParams?: AnalyticsEventParams;
};

export default function TrackedAnalyticsLink({
  eventName,
  eventParams,
  ...props
}: Props) {
  return (
    <a
      {...props}
      onClick={() => sendAnalyticsEvent(eventName, eventParams)}
    />
  );
}
