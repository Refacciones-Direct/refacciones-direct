import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SearchService } from '@/services/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get('make')?.trim() || undefined;
    const model = searchParams.get('model')?.trim() || undefined;

    const supabase = await createClient();
    const searchService = new SearchService(supabase);

    const options = await searchService.getVehicleOptions({ make, model });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Vehicle options error:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicle options' }, { status: 500 });
  }
}
