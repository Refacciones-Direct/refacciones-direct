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

export default async function proxy(request: NextRequest) {
  // 1. Run intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // 2. If intl issued a redirect, return immediately
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // 3. Forward intl locale to server components (handleAuthkitHeaders builds its
  //    own NextResponse.next() which drops intl's x-middleware-override-headers)
  const pathLocale = request.nextUrl.pathname.split('/')[1];
  const locale = (routing.locales as readonly string[]).includes(pathLocale)
    ? pathLocale
    : routing.defaultLocale;
  request.headers.set('x-next-intl-locale', locale);

  // 4. Run authkit — get session + headers
  const { session, headers: authkitHeaders, authorizationUrl } = await authkit(request);

  // 5. Protect authenticated routes
  if (!session.user && !isUnauthenticatedPath(request.nextUrl.pathname) && authorizationUrl) {
    return handleAuthkitHeaders(request, authkitHeaders, { redirect: authorizationUrl });
  }

  // 6. Return via handleAuthkitHeaders — properly partitions internal request
  //    headers (x-workos-middleware, x-workos-session) from browser-safe response
  //    headers (Set-Cookie, Cache-Control, Vary)
  const response = handleAuthkitHeaders(request, authkitHeaders);

  // 7. Selectively append intl cookies (NEXT_LOCALE) without overwriting auth cookies
  for (const cookie of intlResponse.headers.getSetCookie()) {
    response.headers.append('set-cookie', cookie);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|monitoring|.*\\..*).*)', '/'],
};
