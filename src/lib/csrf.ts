const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(',')[0]?.trim();
  return first || null;
}

function configuredCsrfOrigins(): Set<string> {
  const origins = new Set<string>();
  const configuredOrigins = process.env.CSRF_ALLOWED_ORIGINS?.split(',') || [];

  for (const configuredOrigin of configuredOrigins) {
    const origin = originOf(configuredOrigin.trim());
    if (origin) origins.add(origin);
  }

  if (origins.size > 0) return origins;

  const siteOrigin = originOf(process.env.NEXT_PUBLIC_SITE_URL || null);
  if (siteOrigin) origins.add(siteOrigin);

  return origins;
}

function forwardedOrigin(req: Request): string | null {
  const protocol = firstHeaderValue(req.headers.get('x-forwarded-proto'));
  const host =
    firstHeaderValue(req.headers.get('x-forwarded-host')) || firstHeaderValue(req.headers.get('host'));

  if (!protocol || !host) return null;

  const normalizedProtocol = protocol.replace(/:$/, '').toLowerCase();
  if (normalizedProtocol !== 'http' && normalizedProtocol !== 'https') return null;

  return originOf(`${normalizedProtocol}://${host}`);
}

function allowedOrigins(req: Request): Set<string> {
  const origins = configuredCsrfOrigins();
  const proxyOrigin = forwardedOrigin(req);

  if (proxyOrigin && origins.has(proxyOrigin)) {
    origins.add(proxyOrigin);
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.add(new URL(req.url).origin);
    if (proxyOrigin) origins.add(proxyOrigin);
  }

  if (origins.size === 0) {
    origins.add(new URL(req.url).origin);
  }

  return origins;
}

/**
 * Cek CSRF berbasis Origin/Referer untuk metode yang mengubah data. Dipakai proxy (lapis pertama)
 * dan handler admin (lapis kedua, pertahanan berlapis terhadap bypass proxy). Menerima Request
 * biasa (NextRequest adalah turunannya) dan tidak membaca body.
 */
export function hasValidCsrfOrigin(req: Request): boolean {
  if (!CSRF_PROTECTED_METHODS.has(req.method.toUpperCase())) return true;
  const requestOrigin = originOf(req.headers.get('origin')) || originOf(req.headers.get('referer'));
  if (!requestOrigin) return false;

  const origins = allowedOrigins(req);
  if (origins.has(requestOrigin)) return true;

  const proxyOrigin = forwardedOrigin(req);
  return !!proxyOrigin && requestOrigin === proxyOrigin && origins.has(proxyOrigin);
}
