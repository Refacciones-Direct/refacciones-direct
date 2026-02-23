/**
 * POST /api/manufacturer/import/preview
 *
 * Parse + validate uploaded .xlsx → return validation summary + errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ExcelParseService, ExcelParseError, ValidationEngine } from '@/services/import';
import type { DuplicateChecker, StalenessChecker } from '@/services/import';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl } = body as { fileUrl?: string };

    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
    }

    // TODO: Get manufacturer_id from authenticated session
    const manufacturerId = 1; // Placeholder

    const adminClient = createAdminClient();

    // Download file from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('imports')
      .download(fileUrl);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Failed to download file: ${downloadError?.message}` },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Parse
    const parser = new ExcelParseService();
    const parsed = await parser.parse(buffer);

    // Build duplicate checker
    const duplicateChecker: DuplicateChecker = {
      async checkSkus(mfgId: number, skus: string[]) {
        const { data } = await adminClient
          .from('parts')
          .select('sku')
          .eq('manufacturer_id', mfgId)
          .in('sku', skus);
        return new Set((data ?? []).map((r) => r.sku));
      },
    };

    // Build staleness checker
    const stalenessChecker: StalenessChecker = {
      async getLastImportTimestamp(mfgId: number) {
        const { data } = await adminClient
          .from('import_jobs')
          .select('completed_at')
          .eq('manufacturer_id', mfgId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        return data?.completed_at ?? null;
      },
    };

    // Validate
    const engine = new ValidationEngine(duplicateChecker, stalenessChecker);
    const validation = await engine.validate(parsed, manufacturerId);

    return NextResponse.json({ validation });
  } catch (err) {
    if (err instanceof ExcelParseError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error('Preview error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
