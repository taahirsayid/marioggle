import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'apps/server/data');
const dest = join(root, 'apps/server/dist/data');

if (!existsSync(src)) {
  console.warn('No apps/server/data folder to copy');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied server data to ${dest}`);
