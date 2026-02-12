import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: Handle Excel file upload
  return NextResponse.json({ received: true });
}
