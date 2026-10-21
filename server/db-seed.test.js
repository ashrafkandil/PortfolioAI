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
  it('seeds EIM/FASAT second and preserves external SQLite edits', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolioai-seed-test-'));
    const env = { ...process.env, DB_PATH: path.join(tempDir, 'portfolio.db') };
    const run = (args) =>
      execFileSync(process.execPath, args, {
        cwd: repositoryRoot,
        env,
        encoding: 'utf8',
      });

    expect(run(['--env-file-if-exists=.env', 'server/seed.js'])).toContain('Seeded portfolio.db');

    const project = JSON.parse(
      run([
        '--input-type=module',
        '-e',
        "import { getSiteData } from './server/db.js'; console.log(JSON.stringify(getSiteData().projects[1]));",
      ])
    );
    expect(project.id).toBe('eim-fasat');
    expect(project.title).toContain('EIM/FASAT');
    expect(project.features).toContain('Supports agent commission and incentive workflows across insurance product lines.');
    expect(project.tech).toContain('VB6');
    expect(project.experiences.map(({ id }) => id)).toContain('sungard');
    expect(project.links).toEqual([]);

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
