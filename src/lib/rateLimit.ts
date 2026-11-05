import { LRUCache } from 'lru-cache';

type Bucket = { count: number; resetAt: number };

const cache = new LRUCache<string, Bucket>({ max: 5000 });

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = cache.get(key);
  if (!bucket || bucket.resetAt < now) {
    cache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  cache.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}
