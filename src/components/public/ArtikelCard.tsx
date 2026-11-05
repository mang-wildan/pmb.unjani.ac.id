'use client';

import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ANALYTICS_EVENTS, sendAnalyticsEvent } from '@/lib/analytics';
import { stripHtml } from '@/lib/sanitize';

export type ArtikelCardItem = {
  slug: string;
  judul: string;
  isi: string;
  coverImage: string;
  namaPenulis: string;
  publishedAt: Date | string;
};

export default function ArtikelCard({
  item,
  locale,
}: {
  item: ArtikelCardItem;
  locale: 'id' | 'en';
}) {
  const ringkasan = stripHtml(item.isi);
  const tanggal = new Date(item.publishedAt);

  return (
    // FR-37: hover hanya transform + bayangan ::after (kartu-angkat, globals.css); overflow-hidden
    // dipindah ke tautan agar bayangan tidak terpotong.
    <article className="kartu-angkat group h-full rounded-3xl border border-brand-100 bg-white shadow-soft hover:border-brand-300">
      <Link
        href={`/artikel/${item.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        onClick={() =>
          sendAnalyticsEvent(ANALYTICS_EVENTS.articleClick, {
            article_slug: item.slug,
            locale,
          })
        }
      >
        <div className="relative aspect-video overflow-hidden bg-brand-50">
          <Image
            src={item.coverImage}
            alt={`${locale === 'en' ? 'Article cover' : 'Sampul artikel'} ${item.judul}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink transition-colors group-hover:text-brand-700">
            {item.judul}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
            {ringkasan}
          </p>
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-brand-50 pt-4 text-xs text-ink-soft">
            <span className="truncate font-semibold text-ink-muted">{item.namaPenulis}</span>
            <time dateTime={tanggal.toISOString()} className="shrink-0">
              {dayjs(tanggal).locale(locale).format('DD MMM YYYY')}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}
