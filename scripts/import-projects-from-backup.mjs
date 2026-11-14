/**
 * Import projects, tech, features, links, and experience_projects from backup DB.
 * Maps experiences by sort order (since IDs differ).
 * Overwrites existing project-related data in target DB.
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupPath = path.join(__dirname, '..', 'server', 'data', 'backups', 'portfolio-2026-10-31T01-48-08.db');
const targetPath = path.join(__dirname, '..', 'server', 'data', 'portfolio.db');

const backup = new DatabaseSync(backupPath, { readOnly: true });
const target = new DatabaseSync(targetPath);

console.log('Reading backup data...');

// Get experience mapping by sort order
const backupExperiences = backup.prepare('SELECT id, title, company, sort FROM experiences ORDER BY sort').all();
const targetExperiences = target.prepare('SELECT id, title, company, sort FROM experiences ORDER BY sort').all();

const expIdMap = new Map(); // backupExpId -> targetExpId
for (let i = 0; i < backupExperiences.length && i < targetExperiences.length; i++) {
  expIdMap.set(backupExperiences[i].id, targetExperiences[i].id);
  console.log(`Exp mapping: ${backupExperiences[i].title} (${backupExperiences[i].id}) -> ${targetExperiences[i].title} (${targetExperiences[i].id})`);
}

// Get all project data from backup
const backupProjects = backup.prepare('SELECT * FROM projects ORDER BY sort').all();
const backupProjectTech = backup.prepare('SELECT * FROM project_tech ORDER BY project_id, sort').all();
const backupProjectFeatures = backup.prepare('SELECT * FROM project_features ORDER BY project_id, sort').all();
const backupProjectLinks = backup.prepare('SELECT * FROM project_links ORDER BY project_id, sort').all();
const backupExpProjects = backup.prepare('SELECT * FROM experience_projects').all();

console.log(`\nFound ${backupProjects.length} projects in backup`);
console.log(`Found ${backupProjectTech.length} tech entries`);
console.log(`Found ${backupProjectFeatures.length} features`);
console.log(`Found ${backupProjectLinks.length} links`);
console.log(`Found ${backupExpProjects.length} experience-project links`);

// Start transaction
target.exec('BEGIN IMMEDIATE');

try {
  // Delete existing project-related data (child tables first)
  console.log('\nClearing existing project data...');
  target.exec('DELETE FROM experience_projects;');
  target.exec('DELETE FROM project_links;');
  target.exec('DELETE FROM project_tech;');
  target.exec('DELETE FROM project_features;');
  target.exec('DELETE FROM projects;');

  // Insert projects
  const insertProject = target.prepare(
    `INSERT INTO projects (key, icon, title, description, sort) VALUES (?, ?, ?, ?, ?)`
  );
  const insertFeature = target.prepare(`INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)`);
  const insertTech = target.prepare(`INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)`);
  const insertLink = target.prepare(`INSERT INTO project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)`);
  const insertExpProject = target.prepare(`INSERT INTO experience_projects (experience_id, project_id) VALUES (?, ?)`);

  const projectIdMap = new Map(); // backupProjectId -> targetProjectId

  for (const proj of backupProjects) {
    const result = insertProject.run(proj.key, proj.icon, proj.title, proj.description, proj.sort);
    const targetProjId = result.lastInsertRowid;
    projectIdMap.set(proj.id, targetProjId);
    console.log(`Inserted project: ${proj.title} (${proj.id} -> ${targetProjId})`);
  }

  // Insert features
  for (const feat of backupProjectFeatures) {
    const targetProjId = projectIdMap.get(feat.project_id);
    if (targetProjId) {
      insertFeature.run(targetProjId, feat.text, feat.sort);
    }
  }

  // Insert tech
  for (const tech of backupProjectTech) {
    const targetProjId = projectIdMap.get(tech.project_id);
    if (targetProjId) {
      insertTech.run(targetProjId, tech.name, tech.sort);
    }
  }

  // Insert links
  for (const link of backupProjectLinks) {
    const targetProjId = projectIdMap.get(link.project_id);
    if (targetProjId) {
      insertLink.run(targetProjId, link.label, link.icon, link.url, link.sort);
    }
  }

  // Insert experience_project links (map both IDs)
  for (const ep of backupExpProjects) {
    const targetExpId = expIdMap.get(ep.experience_id);
    const targetProjId = projectIdMap.get(ep.project_id);
    if (targetExpId && targetProjId) {
      insertExpProject.run(targetExpId, targetProjId);
      console.log(`Linked exp ${targetExpId} -> proj ${targetProjId}`);
    }
  }

  target.exec('COMMIT');
  console.log('\nImport complete!');
  console.log(`Projects imported: ${backupProjects.length}`);
  console.log(`Experience-project links: ${backupExpProjects.length}`);

} catch (e) {
  target.exec('ROLLBACK');
  console.error('Error:', e);
  process.exit(1);
}

backup.close();
target.close();