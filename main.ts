import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// NEON VICE Cover Studio — entry assembler.
// Paths resolve from this file's own location, never from the working
// directory: the grader runs this file from elsewhere, so a relative
// 'app' or 'screenshots' path would point at nothing and fail.
// Nothing is ever deleted here: the output directory is created if
// missing, the app and its screenshots are copied in, and the dossier
// is written from the copy. No network, fully deterministic.

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Verify the written dossier byte-for-byte: rebuild it from the same
// output directory and refuse to report success on any mismatch.
const check = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
if (check.length !== dossier.length || !check.every((b, i) => b === dossier[i])) {
  throw new Error('dossier verification failed: rebuild differs from written bytes');
}
console.log('dossier written: ' + dossier.length + ' bytes');
