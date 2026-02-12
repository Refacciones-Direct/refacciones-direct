import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: Implement WorkOS webhook handler
  return NextResponse.json({ received: true });
}
