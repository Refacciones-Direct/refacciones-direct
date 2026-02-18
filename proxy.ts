import { NextRequest, NextResponse } from 'next/server';
import {
  authkit,
  handleAuthkitHeaders,
  partitionAuthkitHeaders,
  applyResponseHeaders,
} from '@workos-inc/authkit-nextjs';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Paths that don't require authentication
const unauthenticatedPaths = [
  '/',
  /^\/[a-z]{2}-[A-Z]{2}$/, // locale root (e.g., /es-MX, /en-US)
  /^\/[a-z]{2}-[A-Z]{2}\/login$/,
  /^\/[a-z]{2}-[A-Z]{2}\/signup$/,
  /^\/api\/auth\/callback$/,
  /^\/api\/inngest$/,
];

function isUnauthenticatedPath(pathname: string): boolean {
  return unauthenticatedPaths.some((p) =>
    typeof p === 'string' ? pathname === p : p.test(pathname),
  );
}

export default async function proxy(request: NextRequest) {
  // 1. Run intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // 2. If intl issued a redirect (e.g., / → /es-MX), return immediately
  if (intlResponse && intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // 3. Run authkit — get session + headers
  const { session, headers: authkitHeaders, authorizationUrl } = await authkit(request);

  // 4. Protect authenticated routes
  if (!session.user && !isUnauthenticatedPath(request.nextUrl.pathname) && authorizationUrl) {
    return handleAuthkitHeaders(request, authkitHeaders, { redirect: authorizationUrl });
  }

  // 5. Partition authkit headers: request headers (for withAuth) vs response headers (for browser)
  const { requestHeaders, responseHeaders } = partitionAuthkitHeaders(request, authkitHeaders);

  // 6. Create response with request headers forwarded to server components
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // 7. Merge intl middleware headers (NEXT_LOCALE cookie, x-middleware-rewrite, etc.)
  if (intlResponse) {
    intlResponse.headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  // 8. Apply authkit response headers (Set-Cookie, Cache-Control, Vary) — must be LAST
  return applyResponseHeaders(response, responseHeaders);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)', '/'],
};
