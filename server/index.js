import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { db, getSiteData, saveMessage } from './db.js';
import { createAvatarRouter } from './avatar.js';
import { projectNarration } from './avatar-knowledge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.get('/api/site-data', (_req, res) => {
  const data = getSiteData();
  if (!data) {
    res.status(503).json({ error: 'Database is empty. Run: npm run seed' });
    return;
  }
  // The avatar reads each card's narration aloud; build it here so the spoken
  // summary and the avatar's own answers come from the same code.
  const projects = data.projects.map((project) => ({ ...project, narration: projectNarration(project) }));
  const personalProjects = data.personalProjects.map((project) => ({
    ...project,
    narration: projectNarration(project),
  }));
  res.json({ ...data, projects, personalProjects });
});

app.use('/api/avatar', createAvatarRouter());

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body ?? {};
  if (!name || !email || !message) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }
  saveMessage({ name, email, message });
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true });
});

const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

const port = Number(process.env.PORT) || 3001;

/**
 * True when something already accepts TCP connections on `port`.
 *
 * On Windows a second `listen()` on a busy port can "succeed" (SO_REUSEADDR
 * semantics) and the process then drops off silently, which makes
 * `concurrently -k` tear down vite and report a misleading
 * "[web] vite exited with code 1". Checking up front turns that into a clear
 * message about the real cause: a dev server that is already running.
 */
function portInUse(targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: targetPort, host: '127.0.0.1' });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function reportPortInUse(targetPort) {
  // No "[api]" prefix here: `concurrently -n api,web` already labels every line.
  console.error(`\nPort ${targetPort} is already in use - another API server is running.`);
  console.error('Reuse the dev server that is already open, stop it first, or pick another port:');
  console.error(`  PowerShell:  $env:PORT = '${targetPort + 1}'; npm run dev`);
  console.error(`  cmd:         set PORT=${targetPort + 1} && npm run dev`);
  console.error('  or:          npm run dev:reset   (stops the leftover dev processes)\n');
  process.exit(1);
}

if (await portInUse(port)) {
  reportPortInUse(port);
}

const server = app.listen(port, () => {
  console.log(`Portfolio API listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    reportPortInUse(port);
  }
  throw error;
});
