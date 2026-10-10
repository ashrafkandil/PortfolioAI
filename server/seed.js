import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'));

const tables = [
  'project_links',
  'project_tech',
  'project_features',
  'projects',
  'experience_tech',
  'experience_duties',
  'experiences',
  'skills',
  'skill_categories',
  'about_bios',
  'social_links',
  'profile',
];

db.exec('BEGIN');
try {
  for (const table of tables) db.exec(`DELETE FROM ${table};`);

  db.prepare(
    `INSERT INTO profile (id, site_name, name, role, tagline, short_bio, image, email, phone, location, form_endpoint)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    source.profile.siteName ?? 'Portfolio',
    source.profile.name,
    source.profile.role,
    source.profile.tagline ?? '',
    source.profile.shortBio ?? '',
    source.profile.image ?? '',
    source.profile.email ?? '',
    source.profile.phone ?? '',
    source.profile.location ?? '',
    source.formEndpoint ?? ''
  );

  const insertSocial = db.prepare('INSERT INTO social_links (platform, icon, url, sort) VALUES (?, ?, ?, ?)');
  source.social.forEach((s, i) => insertSocial.run(s.platform, s.icon, s.url, i));

  const insertBio = db.prepare('INSERT INTO about_bios (text, sort) VALUES (?, ?)');
  source.about.bio.forEach((t, i) => insertBio.run(t, i));

  const insertCategory = db.prepare('INSERT INTO skill_categories (title, sort) VALUES (?, ?)');
  const insertSkill = db.prepare('INSERT INTO skills (category_id, name, sort) VALUES (?, ?, ?)');
  source.about.skills.forEach((category, i) => {
    const { lastInsertRowid } = insertCategory.run(category.title, i);
    category.skills.forEach((name, j) => insertSkill.run(Number(lastInsertRowid), name, j));
  });

  const insertExp = db.prepare('INSERT INTO experiences (key, title, period, company, sort) VALUES (?, ?, ?, ?, ?)');
  const insertDuty = db.prepare('INSERT INTO experience_duties (experience_id, text, sort) VALUES (?, ?, ?)');
  const insertExpTech = db.prepare('INSERT INTO experience_tech (experience_id, name, sort) VALUES (?, ?, ?)');
  source.experience.forEach((item, i) => {
    const { lastInsertRowid } = insertExp.run(item.id, item.title, item.period, item.company, i);
    const id = Number(lastInsertRowid);
    item.duties.forEach((duty, j) => insertDuty.run(id, duty, j));
    item.tech.forEach((tech, j) => insertExpTech.run(id, tech, j));
  });

  const insertProject = db.prepare(
    'INSERT INTO projects (key, icon, title, description, sort) VALUES (?, ?, ?, ?, ?)'
  );
  const insertFeature = db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)');
  const insertProjectTech = db.prepare('INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)');
  const insertProjectLink = db.prepare(
    'INSERT INTO project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)'
  );
  source.projects.forEach((project, i) => {
    const { lastInsertRowid } = insertProject.run(project.id, project.icon, project.title, project.description, i);
    const id = Number(lastInsertRowid);
    project.features.forEach((feature, j) => insertFeature.run(id, feature, j));
    project.tech.forEach((tech, j) => insertProjectTech.run(id, tech, j));
    project.links.forEach((link, j) => insertProjectLink.run(id, link.label, link.icon, link.url, j));
  });

  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

console.log(
  `Seeded portfolio.db: ${source.social.length} social links, ${source.experience.length} experiences, ${source.projects.length} projects.`
);
