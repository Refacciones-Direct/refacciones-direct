/**
 * GET /api/manufacturer/export?type=mazas_v1
 *
 * Download the manufacturer's current catalog as .xlsx.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ExportService } from '@/services/import';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get manufacturer_id from authenticated session
    const manufacturerId = 1; // Placeholder

    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type') ?? undefined;

    const adminClient = createAdminClient();
    const exportService = new ExportService(adminClient);

    const { buffer, filename } = await exportService.export(manufacturerId, templateType);

    return new NextResponse(buffer as never, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Export error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
