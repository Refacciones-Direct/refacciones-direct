/**
 * GET /api/manufacturer/import/template?type=mazas_v1
 *
 * Download a blank .xlsx template for the given category.
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemplateGenerator, getTemplateConfig } from '@/services/import';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('type');

    if (!templateType) {
      return NextResponse.json(
        { error: 'Query parameter "type" is required (e.g., ?type=mazas_v1)' },
        { status: 400 },
      );
    }

    const config = getTemplateConfig(templateType);
    if (!config) {
      return NextResponse.json(
        { error: `Unknown template type: "${templateType}"` },
        { status: 400 },
      );
    }

    const generator = new TemplateGenerator();
    const buffer = await generator.generate(templateType);

    return new NextResponse(buffer as never, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template_${config.categorySlug}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Template generation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
