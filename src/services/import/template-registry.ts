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
    dataStartRow: 2,
    attributes: [
      {
        field: 'position',
        header_es: 'Posición',
        header_en: 'Position',
        type: 'dropdown',
        required: true,
        validation: {
          values: [
            'Front',
            'Rear',
            'Front/Rear',
            'Front Left',
            'Front Right',
            'Rear Left',
            'Rear Right',
          ],
        },
        normalizer: 'normalizePosition',
      },
      {
        field: 'bolt_count',
        header_es: 'Birlos',
        header_en: 'Bolt Count',
        type: 'number',
        required: true,
        validation: { min: 3, max: 10 },
      },
      {
        field: 'abs_sensor',
        header_es: 'Sensor ABS',
        header_en: 'ABS Sensor',
        type: 'dropdown',
        required: true,
        validation: { values: ['Yes', 'No'] },
      },
      {
        field: 'drive_type',
        header_es: 'Tracción',
        header_en: 'Drive Type',
        type: 'dropdown',
        required: false,
        validation: {
          values: ['2WD', '4WD', 'AWD', 'FWD', 'RWD', '2WD/4WD'],
        },
        normalizer: 'normalizeDriveType',
      },
    ],
  },

  alternadores_v1: {
    displayName: 'Alternadores / Alternators',
    partType: 'alternator',
    categorySlug: 'alternadores',
    version: '1',
    dataStartRow: 2,
    attributes: [
      {
        field: 'amperage',
        header_es: 'Amperaje',
        header_en: 'Amperage',
        type: 'number',
        required: true,
        validation: { min: 10, max: 500 },
      },
      {
        field: 'voltage',
        header_es: 'Voltaje',
        header_en: 'Voltage',
        type: 'dropdown',
        required: true,
        validation: { values: ['12V', '24V'] },
      },
      {
        field: 'pulley_type',
        header_es: 'Tipo Polea',
        header_en: 'Pulley Type',
        type: 'dropdown',
        required: false,
        validation: {
          values: ['Serpentine', 'V-Belt', 'Clutch Pulley', 'Decoupler'],
        },
      },
    ],
  },

  soportes_motor_v1: {
    displayName: 'Soportes de Motor / Engine Mounts',
    partType: 'engine_mount',
    categorySlug: 'soportes-motor',
    version: '1',
    dataStartRow: 2,
    attributes: [
      {
        field: 'position',
        header_es: 'Posición',
        header_en: 'Position',
        type: 'dropdown',
        required: true,
        validation: {
          values: [
            'Front',
            'Rear',
            'Front Left',
            'Front Right',
            'Rear Left',
            'Rear Right',
            'Upper',
            'Lower',
            'Transmission',
          ],
        },
        normalizer: 'normalizePosition',
      },
      {
        field: 'material',
        header_es: 'Material',
        header_en: 'Material',
        type: 'dropdown',
        required: false,
        validation: {
          values: ['Rubber', 'Hydraulic', 'Polyurethane', 'Solid'],
        },
      },
    ],
  },

  cables_v1: {
    displayName: 'Cables de Bujía / Spark Plug Wires',
    partType: 'spark_plug_wire',
    categorySlug: 'cables-bujia',
    version: '1',
    dataStartRow: 2,
    attributes: [
      {
        field: 'wire_count',
        header_es: 'Cantidad de Cables',
        header_en: 'Wire Count',
        type: 'number',
        required: true,
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
