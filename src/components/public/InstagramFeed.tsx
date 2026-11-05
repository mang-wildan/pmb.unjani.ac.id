import Image from 'next/image';
import Reveal from './Reveal';

export type InstagramPostItem = {
  id: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
};

export default function InstagramFeed({ posts }: { posts: InstagramPostItem[] }) {
  if (!posts.length) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {posts.map((post, indeks) => {
        const imgSrc = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
        if (!imgSrc) return null;
        return (
          <Reveal key={post.id} urutan={indeks}>
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-2xl bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
            >
              <Image
                src={imgSrc}
                alt="Post Instagram @infopmbunjani"
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                // FR-37: hover/fokus hanya transform (motion-safe) dan warna overlay.
              className="object-cover transition-transform duration-500 ease-gerak motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105"
              />
              <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 group-focus-visible:bg-ink/30 transition-colors duration-300 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-8 h-8 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 drop-shadow"
                  aria-hidden
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              {post.media_type === 'VIDEO' && (
                <span className="absolute top-2 right-2 rounded-full bg-ink/60 p-1" aria-label="Video">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </a>
          </Reveal>
        );
      })}
    </div>
  );
}
