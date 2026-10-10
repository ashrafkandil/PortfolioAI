/**
 * Free the ports used by `npm run dev` (API 3001, vite 5173).
 *
 * A dev server left behind by a closed terminal keeps both ports bound, which
 * makes the next `npm run dev` fail with "[web] Error: Port 5173 is already in
 * use". Only processes whose executable looks like node are terminated, and
 * `--dry-run` (or `-n`) just reports what would be stopped.
 *
 * Usage: npm run dev:reset [-- --dry-run]
 */
import { execFileSync } from 'node:child_process';

const API_PORT = Number(process.env.PORT) || 3001;
const WEB_PORT = Number(process.env.VITE_PORT) || 5173;
const dryRun = process.argv.slice(2).some((arg) => arg === '--dry-run' || arg === '-n');

function run(command, args) {
  try {
    // Capture stderr too: `execFileSync` inherits it by default, which would
    // let "ERROR: The process ... not found." leak into the console.
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // `lsof`/`taskkill` exit non-zero for benign cases, which is not fatal here.
    return typeof error.stdout === 'string' ? error.stdout : '';
  }
}

/** PIDs of the processes listening on `port`, per platform. */
function findListeners(port) {
  if (process.platform === 'win32') {
    // No `-p tcp`: vite binds "[::1]:5173", which only shows up in the TCP/IPv6
    // table, and `netstat -p tcp` silently skips those rows.
    const out = run('netstat', ['-ano']);
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!/LISTENING/i.test(line)) continue;
      // Proto  Local Address  Foreign Address  State  PID
      const columns = line.trim().split(/\s+/);
      const local = columns[1] ?? '';
      const pid = columns.at(-1) ?? '';
      // vite binds "[::1]:5173", the API binds "[::]:3001" / "0.0.0.0:3001".
      if (local.endsWith(`:${port}`) && /^\d+$/.test(pid)) pids.add(Number(pid));
    }
    return [...pids];
  }
  const out = run('lsof', ['-ti', `TCP:${port}`, '-sTCP:LISTEN']);
  return out.split('\n').map((line) => Number(line.trim())).filter(Boolean);
}

function processName(pid) {
  if (process.platform === 'win32') {
    const out = run('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']);
    const match = out.match(/^"([^"]+)"/m);
    return match ? match[1] : '';
  }
  return run('ps', ['-p', String(pid), '-o', 'comm=']).trim();
}

/** Terminates `pid`; a process that vanished mid-flight counts as success. */
function kill(pid) {
  const command = process.platform === 'win32' ? 'taskkill' : 'kill';
  const args = process.platform === 'win32' ? ['/PID', String(pid), '/F'] : ['-9', String(pid)];
  try {
    execFileSync(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return !isRunning(pid);
  }
}

/** True while `pid` still exists (signal 0 performs existence checks only). */
function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

let stopped = 0;

for (const port of [API_PORT, WEB_PORT]) {
  const pids = findListeners(port);
  if (pids.length === 0) {
    console.log(`port ${port}: free`);
    continue;
  }
  for (const pid of pids) {
    // Stopping the API also tears down vite via `concurrently -k`, so a later
    // PID in this list may already be gone by the time we get to it.
    if (!isRunning(pid)) {
      console.log(`port ${port}: PID ${pid} already exited`);
      continue;
    }
    const name = processName(pid);
    const looksLikeNode = /node|vite/i.test(name);
    if (!looksLikeNode) {
      console.log(`port ${port}: PID ${pid} (${name || 'unknown'}) is NOT a node process - left running`);
      continue;
    }
    if (dryRun) {
      console.log(`port ${port}: would stop PID ${pid} (${name})`);
      continue;
    }
    if (kill(pid)) {
      stopped += 1;
      console.log(`port ${port}: stopped PID ${pid} (${name})`);
    } else {
      console.log(`port ${port}: PID ${pid} (${name}) is still running - stop it manually`);
    }
  }
}

console.log(
  dryRun
    ? '\ndry run only - nothing was stopped. Re-run without --dry-run to free the ports.'
    : stopped > 0
      ? `\n${stopped} process(es) stopped - you can run "npm run dev" now.`
      : '\nNothing to stop - the dev ports are already free.',
);
