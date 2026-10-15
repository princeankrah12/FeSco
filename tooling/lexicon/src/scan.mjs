import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { findViolations } from './core.mjs';

/**
 * @typedef {object} LexiconConfig
 * @property {string[]} extensions file extensions (or exact basenames) to scan
 * @property {string[]} ignoreDirs directory names skipped anywhere in the tree
 * @property {string[]} ignoreFiles exact basenames skipped anywhere
 * @property {string[]} allowlist repo-relative paths exempt from scanning;
 *   a trailing `/**` exempts a whole directory. Keep this list tiny — it is
 *   reserved for files that *define* the lexicon.
 */

/** @param {string} relPath @param {string[]} allowlist */
function isAllowlisted(relPath, allowlist) {
  return allowlist.some((entry) =>
    entry.endsWith('/**') ? relPath.startsWith(entry.slice(0, -2)) : relPath === entry,
  );
}

/** @param {string} name @param {LexiconConfig} config */
function isScannable(name, config) {
  return config.extensions.some((ext) => name === ext || name.endsWith(ext));
}

/**
 * Recursively yields repo-relative POSIX paths of files to scan.
 * @param {string} root @param {string} dir @param {LexiconConfig} config
 * @returns {AsyncGenerator<string>}
 */
async function* walk(root, dir, config) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (config.ignoreDirs.includes(entry.name)) continue;
      if (isAllowlisted(`${rel}/`, config.allowlist)) continue;
      yield* walk(root, abs, config);
    } else if (
      entry.isFile() &&
      isScannable(entry.name, config) &&
      !config.ignoreFiles.includes(entry.name) &&
      !isAllowlisted(rel, config.allowlist)
    ) {
      yield rel;
    }
  }
}

/**
 * Scans a repository. File *paths* are checked as well as contents, so a file
 * named e.g. `trips.service.ts` is caught even if its body is clean.
 *
 * @param {string} root absolute repo root
 * @param {LexiconConfig} config
 */
export async function scanRepository(root, config) {
  /** @type {(import('./core.mjs').Violation & { file: string })[]} */
  const violations = [];
  let filesScanned = 0;
  let suppressions = 0;

  for await (const rel of walk(root, root, config)) {
    filesScanned += 1;

    for (const v of findViolations(rel).violations) {
      violations.push({ ...v, file: rel, line: 0 });
    }

    const content = await readFile(path.join(root, rel), 'utf8');
    const result = findViolations(content);
    suppressions += result.suppressions;
    for (const v of result.violations) violations.push({ ...v, file: rel });
  }

  return { violations, filesScanned, suppressions };
}
