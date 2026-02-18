import { NextRequest } from 'next/server';
import { authkit, handleAuthkitHeaders } from '@workos-inc/authkit-nextjs';
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

export default async function middleware(request: NextRequest) {
  // 1. Run intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // 2. If intl issued a redirect, return immediately
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // 3. Run authkit — get session + headers
  const { session, headers: authkitHeaders, authorizationUrl } = await authkit(request);

  // 4. Protect authenticated routes
  if (!session.user && !isUnauthenticatedPath(request.nextUrl.pathname) && authorizationUrl) {
    return handleAuthkitHeaders(request, authkitHeaders, { redirect: authorizationUrl });
  }

  // 5. Return via handleAuthkitHeaders — properly partitions internal request
  //    headers (x-workos-middleware, x-workos-session) from browser-safe response
  //    headers (Set-Cookie, Cache-Control, Vary)
  const response = handleAuthkitHeaders(request, authkitHeaders);

  // 6. Selectively append intl cookies (NEXT_LOCALE) without overwriting auth cookies
  for (const cookie of intlResponse.headers.getSetCookie()) {
    response.headers.append('set-cookie', cookie);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)', '/'],
};
