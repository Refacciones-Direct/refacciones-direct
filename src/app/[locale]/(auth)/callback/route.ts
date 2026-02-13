// This callback route has been moved to /api/auth/callback
// to avoid locale prefix dependency in the WorkOS redirect URI.
// See: src/app/api/auth/callback/route.ts
//
// This file is kept temporarily to avoid 404s during transition.
// TODO: Remove this file once all references are updated.

import { redirect } from 'next/navigation';

export async function GET() {
  redirect('/api/auth/callback');
}
