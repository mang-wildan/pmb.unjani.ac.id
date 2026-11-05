import dns from 'node:dns';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;
const MONGO_DIRECT_URI = process.env.MONGO_DIRECT_URI;

if (!MONGO_URI && !MONGO_DIRECT_URI) {
  // Don't throw at import time in dev; defer to first connect so build doesn't fail.
  // But log loudly once.
  // eslint-disable-next-line no-console
  console.warn('[db] MONGO_URI or MONGO_DIRECT_URI is not set; database calls will fail until configured.');
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { _mongooseCache?: MongooseCache };

const cache: MongooseCache = globalForMongoose._mongooseCache ?? { conn: null, promise: null };
globalForMongoose._mongooseCache = cache;

function configureDns(uri: string | undefined) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

function getPrimaryMongoUri() {
  return MONGO_URI || MONGO_DIRECT_URI;
}

function getPrimaryMongoUriSource() {
  return MONGO_URI ? 'MONGO_URI' : 'MONGO_DIRECT_URI';
}

function shouldRetryWithDirectUri(error: unknown) {
  if (!MONGO_DIRECT_URI || !MONGO_URI) return false;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === 'ECONNREFUSED' ||
    message.includes('querySrv') ||
    message.includes('ENOTFOUND') ||
    message.includes('ETIMEOUT')
  );
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const primaryUri = getPrimaryMongoUri();
    if (!primaryUri) throw new Error('MONGO_URI or MONGO_DIRECT_URI env var is required');
    const primarySource = getPrimaryMongoUriSource();
    configureDns(primaryUri);
    // eslint-disable-next-line no-console
    console.info(`[db] connecting using ${primarySource}`);
    cache.promise = mongoose
      .connect(primaryUri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 50,
        minPoolSize: 5,
      })
      .catch((error) => {
        if (!shouldRetryWithDirectUri(error)) throw error;
        // eslint-disable-next-line no-console
        console.warn('[db] primary SRV connection failed; retrying with MONGO_DIRECT_URI');
        return mongoose.connect(MONGO_DIRECT_URI as string, {
          serverSelectionTimeoutMS: 5000,
          maxPoolSize: 50,
          minPoolSize: 5,
        });
      })
      .then((m) => {
        mongoose.set('strictQuery', true);
        return m;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
