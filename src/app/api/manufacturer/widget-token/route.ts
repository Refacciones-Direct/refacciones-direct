import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Generate WorkOS widget token
  return NextResponse.json({ token: '' });
}
