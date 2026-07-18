/**
 * Copy the bundled JSON data into dist/ after `tsc`, since TypeScript does not
 * emit non-code assets. Uses fs.cpSync (Node 20+) so it works on any OS with
 * no native modules or shell dependency.
 */
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../src/data');
const dest = resolve(here, '../dist/data');

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`copied data: ${src} -> ${dest}`);
