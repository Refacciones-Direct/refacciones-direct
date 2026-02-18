import { authkit } from '@workos-inc/authkit-nextjs';
import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
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
  return unauthenticatedPaths.some((pattern) =>
    typeof pattern === 'string' ? pathname === pattern : pattern.test(pathname),
  );
}

export default async function proxy(request: NextRequest) {
  // Run next-intl middleware first (handles locale routing)
  const intlResponse = intlMiddleware(request);

  // If intl middleware issued a redirect (e.g., / → /es-MX), return it immediately
  if (intlResponse && intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // Run WorkOS auth (handles session refresh + sets headers)
  const { session, headers: authHeaders } = await authkit(request);

  // If user is not authenticated and path requires auth, redirect to login
  if (!session.user && !isUnauthenticatedPath(request.nextUrl.pathname)) {
    const locale = request.nextUrl.pathname.split('/')[1] || 'es-MX';
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Merge WorkOS auth headers into the intl response
  const response = intlResponse || NextResponse.next();
  authHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)', '/'],
};
