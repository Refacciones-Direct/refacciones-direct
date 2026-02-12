import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: Implement Stripe webhook handler
  return NextResponse.json({ received: true });
}
