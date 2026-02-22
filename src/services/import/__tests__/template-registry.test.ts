import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_REGISTRY,
  getTemplateConfig,
  getTemplateTypes,
  getTemplateEntries,
} from '../template-registry';
import type { TemplateConfig, TemplateAttribute } from '../types';

describe('TemplateRegistry', () => {
  const entries = Object.entries(TEMPLATE_REGISTRY);

  // -------------------------------------------------------------------------
  // Data integrity
  // -------------------------------------------------------------------------

  it('has at least 4 registered templates', () => {
    expect(entries.length).toBeGreaterThanOrEqual(4);
  });

  it.each(entries)('%s has a non-empty displayName', (_key, config: TemplateConfig) => {
    expect(config.displayName.length).toBeGreaterThan(0);
  });

  it.each(entries)(
    '%s has a valid partType (snake_case, non-empty)',
    (_key, config: TemplateConfig) => {
      expect(config.partType).toMatch(/^[a-z][a-z0-9_]*$/);
    },
  );

  it.each(entries)(
    '%s has a valid categorySlug (kebab-case, non-empty)',
    (_key, config: TemplateConfig) => {
      expect(config.categorySlug).toMatch(/^[a-z][a-z0-9-]*$/);
    },
  );

  it.each(entries)('%s has a valid version string', (_key, config: TemplateConfig) => {
    expect(config.version).toMatch(/^\d+$/);
  });

  it.each(entries)('%s has dataStartRow >= 3', (_key, config: TemplateConfig) => {
    expect(config.dataStartRow).toBeGreaterThanOrEqual(3);
  });

  it.each(entries)('%s has at least one attribute', (_key, config: TemplateConfig) => {
    expect(config.attributes.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Attribute field uniqueness
  // -------------------------------------------------------------------------

  it.each(entries)('%s has unique attribute field names', (_key, config: TemplateConfig) => {
    const fields = config.attributes.map((a) => a.field);
    expect(new Set(fields).size).toBe(fields.length);
  });

  it.each(entries)('%s has unique attribute header_es values', (_key, config: TemplateConfig) => {
    const headers = config.attributes.map((a) => a.header_es);
    expect(new Set(headers).size).toBe(headers.length);
  });

  // -------------------------------------------------------------------------
  // Attribute validation rules
  // -------------------------------------------------------------------------

  it('number attributes with validation have min <= max', () => {
    for (const [, config] of entries) {
      for (const attr of config.attributes) {
        if (
          attr.type === 'number' &&
          attr.validation?.min !== undefined &&
          attr.validation?.max !== undefined
        ) {
          expect(attr.validation.min).toBeLessThanOrEqual(attr.validation.max);
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // Registry key format
  // -------------------------------------------------------------------------

  it('all registry keys follow snake_case_vN pattern', () => {
    for (const key of Object.keys(TEMPLATE_REGISTRY)) {
      expect(key).toMatch(/^[a-z][a-z0-9_]*_v\d+$/);
    }
  });

  // -------------------------------------------------------------------------
  // No duplicate categorySlug across templates
  // -------------------------------------------------------------------------

  it('no two templates share the same categorySlug', () => {
    const slugs = entries.map(([, config]) => config.categorySlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  // -------------------------------------------------------------------------
  // Lookup helpers
  // -------------------------------------------------------------------------

  describe('getTemplateConfig', () => {
    it('returns config for a valid template type', () => {
      const config = getTemplateConfig('mazas_v1');
      expect(config).toBeDefined();
      expect(config!.partType).toBe('wheel_hub');
    });

    it('returns undefined for an unknown template type', () => {
      expect(getTemplateConfig('nonexistent_v1')).toBeUndefined();
    });
  });

  describe('getTemplateTypes', () => {
    it('returns all registered template type keys', () => {
      const types = getTemplateTypes();
      expect(types).toContain('mazas_v1');
      expect(types).toContain('alternadores_v1');
      expect(types).toContain('soportes_motor_v1');
      expect(types).toContain('cables_v1');
      expect(types.length).toBe(entries.length);
    });
  });

  describe('getTemplateEntries', () => {
    it('returns key-config pairs', () => {
      const result = getTemplateEntries();
      expect(result.length).toBe(entries.length);
      for (const [key, config] of result) {
        expect(typeof key).toBe('string');
        expect(config.displayName).toBeDefined();
      }
    });
  });
});
