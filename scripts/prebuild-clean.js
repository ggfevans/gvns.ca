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
import { join } from 'node:path';

const targetFile = 'CLAUDE.md';

let files;
try {
  files = readdirSync('.', { recursive: true, withFileTypes: true });
} catch (err) {
  // Directory read failed — nothing to clean
  if (err.code !== 'ENOENT') {
    console.error(`Warning: ${err.message}`);
  }
  process.exit(0);
}

for (const file of files) {
  if (file.isFile() && file.name === targetFile) {
    const parentDir = file.parentPath ?? file.path;
    // Skip root-level CLAUDE.md (parentDir is '.')
    if (parentDir === '.') continue;

    const filePath = join(parentDir, file.name);
    try {
      unlinkSync(filePath);
      console.log(`Removed: ${filePath}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Warning: failed to remove ${filePath}: ${err.message}`);
      }
    }
  }
}
