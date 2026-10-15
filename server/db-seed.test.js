import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repositoryRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let tempDir;

afterEach(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('database seeding', () => {
  it('preserves external SQLite edits and returns them from the live site data reader', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolioai-seed-test-'));
    const env = { ...process.env, DB_PATH: path.join(tempDir, 'portfolio.db') };
    const run = (args) =>
      execFileSync(process.execPath, args, {
        cwd: repositoryRoot,
        env,
        encoding: 'utf8',
      });

    expect(run(['--env-file-if-exists=.env', 'server/seed.js'])).toContain('Seeded portfolio.db');

    run([
      '--input-type=module',
      '-e',
      "import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync(process.env.DB_PATH); db.prepare('UPDATE profile SET name = ? WHERE id = 1').run('External IDE Edit'); db.close();",
    ]);
    expect(run(['--env-file-if-exists=.env', 'server/seed.js'])).toContain('leaving it untouched');
    expect(
      run([
        '--input-type=module',
        '-e',
        "import { getSiteData } from './server/db.js'; console.log(getSiteData().profile.name);",
      ]).trim()
    ).toBe('External IDE Edit');
  });
});
