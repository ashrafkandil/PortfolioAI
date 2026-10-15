import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The database is durable runtime data, not code. By default it sits next to the
// server (gitignored), but setting DB_PATH points it at a persistent location
// outside the deploy folder - a mounted volume in production, a shared file in
// development - so a redeploy never replaces it and edits made with an external
// SQLite tool are picked up on the next request, with no rebuild or reseed.
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'data', 'portfolio.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
// WAL lets reads continue while a single writer holds the database, and
// busy_timeout makes a blocked writer wait instead of throwing "database is
// locked" - so the running site and an external editor (or the contact form)
// can share the same file safely.
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_name TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  short_bio TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  form_endpoint TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  icon TEXT NOT NULL,
  url TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS about_bios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skill_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  company TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience_duties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience_tech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_tech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  url TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

-- A project can sit behind more than one experience and an experience can cover
-- several projects, so the link between them is many-to-many.
CREATE TABLE IF NOT EXISTS experience_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE (experience_id, project_id)
);

CREATE TABLE IF NOT EXISTS personal_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS personal_project_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES personal_projects(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS personal_project_tech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES personal_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS personal_project_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES personal_projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  url TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// CREATE TABLE IF NOT EXISTS does not add columns to a table that already exists,
// so databases created before the status flag need it added explicitly.
const socialColumns = db.prepare('PRAGMA table_info(social_links)').all();
if (!socialColumns.some((column) => column.name === 'is_active')) {
  db.exec('ALTER TABLE social_links ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1));');
}

export function saveMessage({ name, email, message }) {
  db.prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
}

function readSiteData() {
  const profileRow = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  if (!profileRow) return null;

  const social = db
    .prepare('SELECT platform, icon, url FROM social_links WHERE is_active = 1 ORDER BY sort, id')
    .all()
    .map((r) => ({ platform: r.platform, icon: r.icon, url: r.url }));

  const bio = db.prepare('SELECT text FROM about_bios ORDER BY sort, id').all().map((r) => r.text);

  const skillCategories = db.prepare('SELECT id, title FROM skill_categories ORDER BY sort, id').all();
  const skillsStmt = db.prepare('SELECT name FROM skills WHERE category_id = ? ORDER BY sort, id');
  const skills = skillCategories.map((category) => ({
    title: category.title,
    skills: skillsStmt.all(category.id).map((r) => r.name),
  }));

  const experience = db.prepare('SELECT * FROM experiences ORDER BY sort, id').all().map((row) => ({
    id: row.key,
    title: row.title,
    period: row.period,
    company: row.company,
    duties: db
      .prepare('SELECT text FROM experience_duties WHERE experience_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => r.text),
    tech: db
      .prepare('SELECT name FROM experience_tech WHERE experience_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => r.name),
  }));

  const projects = db.prepare('SELECT * FROM projects ORDER BY sort, id').all().map((row) => ({
    id: row.key,
    icon: row.icon,
    title: row.title,
    description: row.description,
    features: db
      .prepare('SELECT text FROM project_features WHERE project_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => r.text),
    tech: db
      .prepare('SELECT name FROM project_tech WHERE project_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => r.name),
    links: db
      .prepare('SELECT label, icon, url FROM project_links WHERE project_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => ({ label: r.label, icon: r.icon, url: r.url })),
    // The experiences this project belongs to, shown in the card's hover balloon.
    experiences: db
      .prepare(
        `SELECT e.key, e.title, e.company, e.period
           FROM experience_projects ep
           JOIN experiences e ON e.id = ep.experience_id
          WHERE ep.project_id = ?
          ORDER BY e.sort, e.id`
      )
      .all(row.id)
      .map((e) => ({ id: e.key, title: e.title, company: e.company, period: e.period })),
  }));

  const personalProjects = db.prepare('SELECT * FROM personal_projects ORDER BY sort, id').all().map((row) => ({
    id: row.key,
    icon: row.icon,
    title: row.title,
    description: row.description,
    features: db
      .prepare('SELECT text FROM personal_project_features WHERE project_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => r.text),
    tech: db
      .prepare('SELECT name FROM personal_project_tech WHERE project_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => r.name),
    links: db
      .prepare('SELECT label, icon, url FROM personal_project_links WHERE project_id = ? ORDER BY sort, id')
      .all(row.id)
      .map((r) => ({ label: r.label, icon: r.icon, url: r.url })),
    // Personal projects are not tied to a job, so the balloon never shows.
    experiences: [],
  }));

  return {
    profile: {
      siteName: profileRow.site_name,
      name: profileRow.name,
      role: profileRow.role,
      tagline: profileRow.tagline,
      shortBio: profileRow.short_bio,
      image: profileRow.image,
      email: profileRow.email,
      phone: profileRow.phone,
      location: profileRow.location,
    },
    social,
    about: { bio, skills },
    experience,
    projects,
    personalProjects,
    formEndpoint: profileRow.form_endpoint,
  };
}

export function getSiteData() {
  db.exec('BEGIN DEFERRED');
  try {
    const data = readSiteData();
    db.exec('COMMIT');
    return data;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
