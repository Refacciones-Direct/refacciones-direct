import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Handle WorkOS AuthKit callback
  return NextResponse.redirect(new URL('/'));
}
