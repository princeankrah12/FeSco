#!/usr/bin/env node
/**
 * FeSCo Lexicon gate. Exit code 1 if any banned term is found.
 * Usage: node tooling/lexicon/bin/fesco-lexicon.mjs [repoRoot]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRepository } from '../src/scan.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? path.join(here, '..', '..', '..'));
const config = JSON.parse(await readFile(path.join(root, 'lexicon.config.json'), 'utf8'));

const { violations, filesScanned, suppressions } = await scanRepository(root, config);

for (const v of violations) {
  const where = v.line === 0 ? `${v.file} (file path)` : `${v.file}:${v.line}:${v.column}`;
  console.error(`✖ ${where}  "${v.match}" → use "${v.approved}"  (${v.rationale})`);
}

const summary = `FeSCo Lexicon: ${filesScanned} files scanned, ${violations.length} violation(s), ${suppressions} justified exception(s).`;
if (violations.length > 0) {
  console.error(`\n${summary}`);
  process.exit(1);
}
console.log(`✔ ${summary}`);
