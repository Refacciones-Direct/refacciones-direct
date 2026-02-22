/**
 * GET /api/manufacturer/import/errors/[jobId]
 *
 * Download the error .xlsx file for a specific import job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;
    const jobIdNum = parseInt(jobId, 10);

    if (isNaN(jobIdNum)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    // TODO: Get manufacturer_id from authenticated session
    const manufacturerId = 1; // Placeholder

    const adminClient = createAdminClient();

    // Verify the job belongs to this manufacturer
    const { data: job, error: jobError } = await adminClient
      .from('import_jobs')
      .select('error_file_url')
      .eq('id', jobIdNum)
      .eq('manufacturer_id', manufacturerId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    if (!job.error_file_url) {
      return NextResponse.json({ error: 'No error file for this import job' }, { status: 404 });
    }

    // Download from storage
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('imports')
      .download(job.error_file_url);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download error file' }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="errors_import_${jobId}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Error file download error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
