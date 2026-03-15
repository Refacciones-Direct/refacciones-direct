/**
 * Save raw API responses to __snapshots__/ for reference.
 * Files are git-tracked and serve as documentation of actual response shapes.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = join(__dirname, '..', '__snapshots__');

export type SnapshotMeta = {
  timestamp: string;
  endpoint?: string;
  requestSummary?: string;
};

export function saveSnapshot(testName: string, response: unknown, meta?: SnapshotMeta): void {
  const safeName = testName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  const payload = {
    _meta: {
      testName,
      timestamp: meta?.timestamp ?? new Date().toISOString(),
      endpoint: meta?.endpoint,
      requestSummary: meta?.requestSummary,
    },
    ...(typeof response === 'object' && response !== null
      ? (response as Record<string, unknown>)
      : { response }),
  };
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
  const path = join(SNAPSHOT_DIR, `${safeName}.json`);
  writeFileSync(path, JSON.stringify(payload, null, 2), 'utf-8');
}
