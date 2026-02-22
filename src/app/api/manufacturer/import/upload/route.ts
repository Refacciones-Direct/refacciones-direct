/**
 * POST /api/manufacturer/import/upload
 *
 * Accept .xlsx file upload → store in Supabase Storage → return fileUrl.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_FILE_SIZE_BYTES, SUPPORTED_EXTENSIONS } from '@/services/import';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
      return NextResponse.json(
        { error: `Unsupported file type: ${ext}. Only .xlsx is accepted.` },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` },
        { status: 400 },
      );
    }

    // TODO: Get manufacturer_id from authenticated session
    const manufacturerId = 1; // Placeholder

    const adminClient = createAdminClient();
    const timestamp = Date.now();
    const storagePath = `imports/${manufacturerId}/${timestamp}.xlsx`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await adminClient.storage
      .from('imports')
      .upload(storagePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    return NextResponse.json({ fileUrl: storagePath });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
