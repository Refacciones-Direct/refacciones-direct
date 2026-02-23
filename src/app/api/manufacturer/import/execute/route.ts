/**
 * POST /api/manufacturer/import/execute
 *
 * Re-parse + re-validate + insert valid rows into DB.
 * Never trusts client state — always re-validates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ExcelParseService,
  ExcelParseError,
  ValidationEngine,
  ImportExecutor,
  ErrorReportGenerator,
} from '@/services/import';
import type { DuplicateChecker } from '@/services/import';

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

    // Re-parse (never trust client)
    const parser = new ExcelParseService();
    const parsed = await parser.parse(buffer);

    // Re-validate with DB duplicate check
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

    const engine = new ValidationEngine(duplicateChecker);
    const validation = await engine.validate(parsed, manufacturerId);

    if (validation.validParts.length === 0) {
      return NextResponse.json({ error: 'No valid parts to import', validation }, { status: 400 });
    }

    // Execute import
    const executor = new ImportExecutor(adminClient);
    const result = await executor.execute(validation, manufacturerId, fileUrl);

    // Generate error report if needed
    if (result.errors.length > 0) {
      const errorGen = new ErrorReportGenerator();
      const errorBuffer = await errorGen.generate({
        errors: result.errors,
        templateConfig: parsed.templateConfig,
      });

      // Upload error file
      const errorPath = `imports/${manufacturerId}/errors_${result.importJobId}.xlsx`;
      const { error: uploadError } = await adminClient.storage
        .from('imports')
        .upload(errorPath, errorBuffer as never, {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

      if (uploadError) {
        console.error('Failed to upload error report:', uploadError);
      } else {
        // Update import job with error file URL only if upload succeeded
        await adminClient
          .from('import_jobs')
          .update({ error_file_url: errorPath })
          .eq('id', result.importJobId);

        result.errorFileUrl = errorPath;
      }
    }

    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof ExcelParseError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    console.error('Execute error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
