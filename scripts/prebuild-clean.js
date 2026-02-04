#!/usr/bin/env node
/**
 * Cross-platform cleanup of claude-mem CLAUDE.md files from subdirectories.
 *
 * The claude-mem plugin creates CLAUDE.md context files in subdirectories.
 * These can cause issues (e.g., Astro builds them as routes in src/pages/).
 * This script removes all CLAUDE.md files except the root project one.
 *
 * Upstream bug: https://github.com/thedotmack/claude-mem/issues/760
 */

import { readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';

const targetFile = 'CLAUDE.md';

try {
  const files = readdirSync('.', { recursive: true, withFileTypes: true });

  for (const file of files) {
    if (file.isFile() && file.name === targetFile) {
      const parentDir = file.parentPath ?? file.path;
      // Skip root-level CLAUDE.md (parentDir is '.')
      if (parentDir === '.') continue;

      const filePath = join(parentDir, file.name);
      unlinkSync(filePath);
      console.log(`Removed: ${filePath}`);
    }
  }
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.error(`Warning: ${err.message}`);
  }
}
