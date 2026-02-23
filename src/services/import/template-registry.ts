/**
 * Template Registry — drives parsing, validation, template generation, and export.
 *
 * Each entry defines a category-specific template with its attributes,
 * column mappings, validation rules, and normalizers.
 *
 * Adding a new category = add a registry entry + insert a `categories` row.
 * No code changes to the pipeline services.
 */

import type { TemplateConfig } from './types';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  mazas_v1: {
    displayName: 'Mazas / Wheel Hubs',
    partType: 'wheel_hub',
    categorySlug: 'mazas',
    version: '1',
    dataStartRow: 3,
    attributes: [
      {
        field: 'position',
        header_es: 'Posición',
        header_en: 'Position',
        type: 'string',
        required: false,
      },
      {
        field: 'abs_sensor',
        header_es: 'Tipo de ABS',
        header_en: 'ABS Type',
        type: 'string',
        required: false,
      },
      {
        field: 'bolt_count',
        header_es: 'Barrenos',
        header_en: 'Bolt Count',
        type: 'string',
        required: false,
      },
      {
        field: 'drive_type',
        header_es: 'Tipo de Tracción',
        header_en: 'Drive Type',
        type: 'string',
        required: false,
      },
      {
        field: 'specifications',
        header_es: 'Especificaciones',
        header_en: 'Specifications',
        type: 'string',
        required: false,
      },
    ],
  },

  alternadores_v1: {
    displayName: 'Alternadores / Alternators',
    partType: 'alternator',
    categorySlug: 'alternadores',
    version: '1',
    dataStartRow: 3,
    attributes: [
      {
        field: 'amperage',
        header_es: 'Amperaje',
        header_en: 'Amperage',
        type: 'number',
        required: false,
        validation: { min: 10, max: 500 },
      },
      {
        field: 'voltage',
        header_es: 'Voltaje',
        header_en: 'Voltage',
        type: 'string',
        required: false,
      },
      {
        field: 'pulley_type',
        header_es: 'Tipo Polea',
        header_en: 'Pulley Type',
        type: 'string',
        required: false,
      },
    ],
  },

  soportes_motor_v1: {
    displayName: 'Soportes de Motor / Engine Mounts',
    partType: 'engine_mount',
    categorySlug: 'soportes-motor',
    version: '1',
    dataStartRow: 3,
    attributes: [
      {
        field: 'position',
        header_es: 'Posición',
        header_en: 'Position',
        type: 'string',
        required: false,
      },
      {
        field: 'material',
        header_es: 'Material',
        header_en: 'Material',
        type: 'string',
        required: false,
      },
    ],
  },

  cables_v1: {
    displayName: 'Cables de Bujía / Spark Plug Wires',
    partType: 'spark_plug_wire',
    categorySlug: 'cables-bujia',
    version: '1',
    dataStartRow: 3,
    attributes: [
      {
        field: 'wire_count',
        header_es: 'Cantidad de Cables',
        header_en: 'Wire Count',
        type: 'number',
        required: false,
        validation: { min: 1, max: 16 },
      },
      {
        field: 'resistance',
        header_es: 'Resistencia (Ohm/pie)',
        header_en: 'Resistance (Ohm/ft)',
        type: 'string',
        required: false,
      },
    ],
  },
} as const satisfies Record<string, TemplateConfig>;

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

/**
 * Get a template config by its registry key.
 * Returns undefined if not found.
 */
export function getTemplateConfig(templateType: string): TemplateConfig | undefined {
  return TEMPLATE_REGISTRY[templateType];
}

/**
 * Get all registered template types.
 */
export function getTemplateTypes(): string[] {
  return Object.keys(TEMPLATE_REGISTRY);
}

/**
 * Get all registered template configs with their keys.
 */
export function getTemplateEntries(): [string, TemplateConfig][] {
  return Object.entries(TEMPLATE_REGISTRY);
}
