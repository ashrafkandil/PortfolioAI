import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data.json'), 'utf8'));

// seed-data.json is the starting point, not a fixture re-applied on every run.
// The database is the source of truth once it exists: this script only fills an
// empty database (see the guard below) so routine runs never wipe live data.
// Pass --force to deliberately reset back to the JSON contents.
const force = process.argv.slice(2).some((arg) => arg === '--force' || arg === '-f');

// Tables ordered child-first so a --force reset respects foreign keys.
const tables = [
  'experience_projects',
  'project_links',
  'project_tech',
  'project_features',
  'projects',
  'personal_project_links',
  'personal_project_tech',
  'personal_project_features',
  'personal_projects',
  'experience_tech',
  'experience_duties',
  'experiences',
  'skills',
  'skill_categories',
  'about_bios',
  'social_links',
  'profile',
];

// Serialize against other seed processes and external database writers while
// checking whether the tables this seed owns already contain data.
db.exec('BEGIN IMMEDIATE');
const hasSeedData = tables.some((table) => db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get());
if (hasSeedData && !force) {
  db.exec('ROLLBACK');
  console.log('portfolio.db already has data - leaving it untouched. (Run "npm run seed:force" to reset from seed-data.json.)');
  process.exit(0);
}

try {
  if (force) {
    for (const table of tables) db.exec(`DELETE FROM ${table};`);
  }

  db.prepare(
    `INSERT INTO profile (id, site_name, name, role, tagline, short_bio, image, email, phone, location, form_endpoint, contact_title, contact_intro, contact_form_title, contact_form_name_placeholder, contact_form_email_placeholder, contact_form_message_placeholder, contact_form_submit_text, contact_form_sending_text, contact_form_success_text, contact_form_error_text, contact_form_mailto_success)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    source.formEndpoint ?? '',
    source.profile.contactTitle ?? 'Get In Touch',
    source.profile.contactIntro ?? "I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision.",
    source.profile.contactFormTitle ?? 'Send Me a Message',
    source.profile.contactFormNamePlaceholder ?? 'Your Name',
    source.profile.contactFormEmailPlaceholder ?? 'Your Email',
    source.profile.contactFormMessagePlaceholder ?? 'Your Message',
    source.profile.contactFormSubmitText ?? 'Send Message',
    source.profile.contactFormSendingText ?? 'Sending...',
    source.profile.contactFormSuccessText ?? 'Thank you, {name}! Your message has been sent.',
    source.profile.contactFormErrorText ?? 'Something went wrong. Please try again or email me directly.',
    source.profile.contactFormMailtoSuccess ?? 'Your email client should open with the message pre-filled.'
  );

  const insertSocial = db.prepare(
    'INSERT INTO social_links (platform, icon, url, sort, is_active) VALUES (?, ?, ?, ?, ?)'
  );
  // Links are shown unless the seed entry sets "active": false.
  source.social.forEach((s, i) => insertSocial.run(s.platform, s.icon, s.url, i, s.active === false ? 0 : 1));

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
  // Remember each row's generated id so the many-to-many links can be resolved
  // from the seed file's stable keys instead of hard-coded numbers.
  const experienceIds = new Map();
  source.experience.forEach((item, i) => {
    const { lastInsertRowid } = insertExp.run(item.id, item.title, item.period, item.company, i);
    const id = Number(lastInsertRowid);
    experienceIds.set(item.id, id);
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
  const projectIds = new Map();
  source.projects.forEach((project, i) => {
    const { lastInsertRowid } = insertProject.run(project.id, project.icon, project.title, project.description, i);
    const id = Number(lastInsertRowid);
    projectIds.set(project.id, id);
    project.features.forEach((feature, j) => insertFeature.run(id, feature, j));
    project.tech.forEach((tech, j) => insertProjectTech.run(id, tech, j));
    project.links.forEach((link, j) => insertProjectLink.run(id, link.label, link.icon, link.url, j));
  });

  // Many-to-many link between projects and the experiences they were part of.
  const insertExperienceProject = db.prepare(
    'INSERT OR IGNORE INTO experience_projects (experience_id, project_id) VALUES (?, ?)'
  );
  (source.experienceProjects ?? []).forEach(({ experience, projects }) => {
    const experienceId = experienceIds.get(experience);
    if (!experienceId) throw new Error(`Unknown experience key in experienceProjects: ${experience}`);
    projects.forEach((projectKey) => {
      const projectId = projectIds.get(projectKey);
      if (!projectId) throw new Error(`Unknown project key in experienceProjects: ${projectKey}`);
      insertExperienceProject.run(experienceId, projectId);
    });
  });

  const insertPersonalProject = db.prepare(
    'INSERT INTO personal_projects (key, icon, title, description, sort) VALUES (?, ?, ?, ?, ?)'
  );
  const insertPersonalFeature = db.prepare(
    'INSERT INTO personal_project_features (project_id, text, sort) VALUES (?, ?, ?)'
  );
  const insertPersonalTech = db.prepare('INSERT INTO personal_project_tech (project_id, name, sort) VALUES (?, ?, ?)');
  const insertPersonalLink = db.prepare(
    'INSERT INTO personal_project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)'
  );
  source.personalProjects.forEach((project, i) => {
    const { lastInsertRowid } = insertPersonalProject.run(
      project.id,
      project.icon,
      project.title,
      project.description,
      i
    );
    const id = Number(lastInsertRowid);
    project.features.forEach((feature, j) => insertPersonalFeature.run(id, feature, j));
    project.tech.forEach((tech, j) => insertPersonalTech.run(id, tech, j));
    project.links.forEach((link, j) => insertPersonalLink.run(id, link.label, link.icon, link.url, j));
  });

  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const linkCount = (source.experienceProjects ?? []).reduce((total, entry) => total + entry.projects.length, 0);

console.log(
  `${force ? 'Reset' : 'Seeded'} portfolio.db: ${source.social.length} social links, ${source.experience.length} experiences, ${source.projects.length} projects, ${source.personalProjects.length} personal projects, ${linkCount} experience-project links.`
);
