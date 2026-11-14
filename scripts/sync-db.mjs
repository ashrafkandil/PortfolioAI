/**
 * Sync portfolio.db from seed-data.json using UPSERT only.
 *
 * This NEVER deletes rows. It only:
 *   - Inserts new rows that don't exist (by unique key)
 *   - Updates existing rows to match seed-data.json (optional, controlled by --update)
 *
 * Usage:
 *   npm run db:sync           # dry run: shows what would change
 *   npm run db:sync -- --apply # actually apply changes
 *   npm run db:sync -- --apply --update # also update existing rows
 *
 * The .db file is the source of truth. This script only fills gaps.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'server', 'data', 'portfolio.db');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'seed-data.json'), 'utf8'));

const dryRun = !process.argv.includes('--apply');
const updateExisting = process.argv.includes('--update');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}. Run "npm run seed" first.`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

let inserts = 0;
let updates = 0;
let skipped = 0;

function upsert(table, uniqueCols, cols, rows) {
  const placeholders = cols.map(() => '?').join(', ');
  const conflictCols = uniqueCols.join(', ');
  const updateCols = cols.filter(c => !uniqueCols.includes(c)).map(c => `${c} = excluded.${c}`).join(', ');

  // SQLite doesn't support UPSERT with custom conflict target in older versions,
  // so we use INSERT OR IGNORE + optional UPDATE
  for (const row of rows) {
    const values = cols.map(c => row[c]);
    const where = uniqueCols.map((c, i) => `${c} = ?`).join(' AND ');
    const whereValues = uniqueCols.map(c => row[c]);

    const exists = db.prepare(`SELECT 1 FROM ${table} WHERE ${where}`).get(...whereValues);

    if (exists) {
      if (updateExisting) {
        const setClause = cols.filter(c => !uniqueCols.includes(c)).map(c => `${c} = ?`).join(', ');
        const setValues = cols.filter(c => !uniqueCols.includes(c)).map(c => row[c]);
        if (setClause) {
          const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
          if (!dryRun) db.prepare(sql).run(...setValues, ...whereValues);
          updates++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } else {
      const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
      if (!dryRun) db.prepare(sql).run(...values);
      inserts++;
    }
  }
}

// ===== PROFILE (single row, id=1) =====
if (source.profile) {
  const p = source.profile;
  const exists = db.prepare('SELECT 1 FROM profile WHERE id = 1').get();
  if (!exists) {
    const sql = `INSERT INTO profile (id, site_name, name, role, tagline, short_bio, image, avatar_image, email, phone, location, form_endpoint, contact_title, contact_intro, contact_form_title, contact_form_name_placeholder, contact_form_email_placeholder, contact_form_message_placeholder, contact_form_submit_text, contact_form_sending_text, contact_form_success_text, contact_form_error_text, contact_form_mailto_success)
                 VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    if (!dryRun) db.prepare(sql).run(
      p.siteName ?? 'Portfolio', p.name, p.role, p.tagline ?? '', p.shortBio ?? '', p.image ?? '',
      p.avatarImage ?? '', p.email ?? '', p.phone ?? '', p.location ?? '', source.formEndpoint ?? '',
      p.contactTitle ?? 'Get In Touch', p.contactIntro ?? "I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision.",
      p.contactFormTitle ?? 'Send Me a Message', p.contactFormNamePlaceholder ?? 'Your Name',
      p.contactFormEmailPlaceholder ?? 'Your Email', p.contactFormMessagePlaceholder ?? 'Your Message',
      p.contactFormSubmitText ?? 'Send Message', p.contactFormSendingText ?? 'Sending...',
      p.contactFormSuccessText ?? 'Thank you, {name}! Your message has been sent.',
      p.contactFormErrorText ?? 'Something went wrong. Please try again or email me directly.',
      p.contactFormMailtoSuccess ?? 'Your email client should open with the message pre-filled.'
    );
    inserts++;
  } else if (updateExisting) {
    // Update all profile fields
    const sql = `UPDATE profile SET site_name=?, name=?, role=?, tagline=?, short_bio=?, image=?, avatar_image=?, email=?, phone=?, location=?, form_endpoint=?, contact_title=?, contact_intro=?, contact_form_title=?, contact_form_name_placeholder=?, contact_form_email_placeholder=?, contact_form_message_placeholder=?, contact_form_submit_text=?, contact_form_sending_text=?, contact_form_success_text=?, contact_form_error_text=?, contact_form_mailto_success=? WHERE id=1`;
    if (!dryRun) db.prepare(sql).run(
      p.siteName ?? 'Portfolio', p.name, p.role, p.tagline ?? '', p.shortBio ?? '', p.image ?? '',
      p.avatarImage ?? '', p.email ?? '', p.phone ?? '', p.location ?? '', source.formEndpoint ?? '',
      p.contactTitle ?? 'Get In Touch', p.contactIntro ?? "I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision.",
      p.contactFormTitle ?? 'Send Me a Message', p.contactFormNamePlaceholder ?? 'Your Name',
      p.contactFormEmailPlaceholder ?? 'Your Email', p.contactFormMessagePlaceholder ?? 'Your Message',
      p.contactFormSubmitText ?? 'Send Message', p.contactFormSendingText ?? 'Sending...',
      p.contactFormSuccessText ?? 'Thank you, {name}! Your message has been sent.',
      p.contactFormErrorText ?? 'Something went wrong. Please try again or email me directly.',
      p.contactFormMailtoSuccess ?? 'Your email client should open with the message pre-filled.'
    );
    updates++;
  } else {
    skipped++;
  }
}

// ===== SITE META =====
if (source.siteMeta) {
  const m = source.siteMeta;
  const exists = db.prepare('SELECT 1 FROM site_meta WHERE id = 1').get();
  if (!exists) {
    if (!dryRun) db.prepare(`INSERT INTO site_meta (id, seo_title, seo_description, og_title, og_description, og_url, theme_color) VALUES (1, ?, ?, ?, ?, ?, ?)`).run(m.seoTitle, m.seoDescription, m.ogTitle, m.ogDescription, m.ogUrl, m.themeColor);
    inserts++;
  } else if (updateExisting) {
    if (!dryRun) db.prepare(`UPDATE site_meta SET seo_title=?, seo_description=?, og_title=?, og_description=?, og_url=?, theme_color=? WHERE id=1`).run(m.seoTitle, m.seoDescription, m.ogTitle, m.ogDescription, m.ogUrl, m.themeColor);
    updates++;
  } else skipped++;
}

// ===== SOCIAL LINKS (by platform) =====
if (source.social) {
  const insertSql = `INSERT INTO social_links (platform, icon, url, sort, is_active) VALUES (?, ?, ?, ?, ?)`;
  source.social.forEach((s, i) => {
    const exists = db.prepare('SELECT 1 FROM social_links WHERE platform = ?').get(s.platform);
    if (!exists) {
      if (!dryRun) db.prepare(insertSql).run(s.platform, s.icon, s.url, i, s.active === false ? 0 : 1);
      inserts++;
    } else if (updateExisting) {
      if (!dryRun) db.prepare(`UPDATE social_links SET icon=?, url=?, sort=?, is_active=? WHERE platform=?`).run(s.icon, s.url, i, s.active === false ? 0 : 1, s.platform);
      updates++;
    } else skipped++;
  });
}

// ===== NAV LINKS (by key) =====
if (source.navLinks) {
  source.navLinks.forEach((l, i) => {
    const exists = db.prepare('SELECT 1 FROM nav_links WHERE key = ?').get(l.key);
    if (!exists) {
      if (!dryRun) db.prepare(`INSERT INTO nav_links (key, label, sort) VALUES (?, ?, ?)`).run(l.key, l.label, i);
      inserts++;
    } else if (updateExisting) {
      if (!dryRun) db.prepare(`UPDATE nav_links SET label=?, sort=? WHERE key=?`).run(l.label, i, l.key);
      updates++;
    } else skipped++;
  });
}

// ===== PRONUNCIATIONS (by word) =====
if (source.pronunciations) {
  source.pronunciations.forEach((p, i) => {
    const exists = db.prepare('SELECT 1 FROM pronunciations WHERE word = ?').get(p.word);
    if (!exists) {
      if (!dryRun) db.prepare(`INSERT INTO pronunciations (word, phonetic, sort) VALUES (?, ?, ?)`).run(p.word, p.phonetic, i);
      inserts++;
    } else if (updateExisting) {
      if (!dryRun) db.prepare(`UPDATE pronunciations SET phonetic=?, sort=? WHERE word=?`).run(p.phonetic, i, p.word);
      updates++;
    } else skipped++;
  });
}

// ===== AVATAR SETTINGS =====
if (source.avatarSettings) {
  const a = source.avatarSettings;
  const exists = db.prepare('SELECT 1 FROM avatar_settings WHERE id = 1').get();
  if (!exists) {
    if (!dryRun) db.prepare(`INSERT INTO avatar_settings (id, image, welcome_message) VALUES (1, ?, ?)`).run(a.image, a.welcomeMessage);
    inserts++;
  } else if (updateExisting) {
    if (!dryRun) db.prepare(`UPDATE avatar_settings SET image=?, welcome_message=? WHERE id=1`).run(a.image, a.welcomeMessage);
    updates++;
  } else skipped++;
}

// ===== ABOUT BIOS (append only) =====
if (source.about?.bio) {
  source.about.bio.forEach((text, i) => {
    const exists = db.prepare('SELECT 1 FROM about_bios WHERE text = ?').get(text);
    if (!exists) {
      if (!dryRun) db.prepare(`INSERT INTO about_bios (text, sort) VALUES (?, ?)`).run(text, i);
      inserts++;
    } else skipped++;
  });
}

// ===== SKILL CATEGORIES & SKILLS =====
if (source.about?.skills) {
  for (const [catIdx, category] of source.about.skills.entries()) {
    // Category
    let catId;
    const catExists = db.prepare('SELECT id FROM skill_categories WHERE title = ?').get(category.title);
    if (catExists) {
      catId = catExists.id;
    } else {
      if (!dryRun) { catId = db.prepare(`INSERT INTO skill_categories (title, sort) VALUES (?, ?)`).run(category.title, catIdx).lastInsertRowid; }
      else catId = 0;
      inserts++;
    }
    // Skills
    for (const [skillIdx, skill] of category.skills.entries()) {
      const skillExists = db.prepare('SELECT 1 FROM skills WHERE category_id = ? AND name = ?').get(catId, skill);
      if (!skillExists && catId) {
        if (!dryRun) db.prepare(`INSERT INTO skills (category_id, name, sort) VALUES (?, ?, ?)`).run(catId, skill, skillIdx);
        inserts++;
      } else if (skillExists) skipped++;
    }
  }
}

// ===== EXPERIENCES & RELATED =====
if (source.experience) {
  const expIdMap = new Map();
  for (const [idx, exp] of source.experience.entries()) {
    const exists = db.prepare('SELECT id FROM experiences WHERE key = ?').get(exp.id);
    if (exists) {
      expIdMap.set(exp.id, exists.id);
    } else {
      const id = !dryRun ? db.prepare(`INSERT INTO experiences (key, title, period, company, sort) VALUES (?, ?, ?, ?, ?)`).run(exp.id, exp.title, exp.period, exp.company, idx).lastInsertRowid : 0;
      if (!dryRun) expIdMap.set(exp.id, id);
      inserts++;
    }

    // Duties
    for (const [dIdx, duty] of exp.duties.entries()) {
      const dutyExists = db.prepare('SELECT 1 FROM experience_duties WHERE experience_id = ? AND text = ?').get(expIdMap.get(exp.id), duty);
      if (!dutyExists) {
        if (!dryRun) db.prepare(`INSERT INTO experience_duties (experience_id, text, sort) VALUES (?, ?, ?)`).run(expIdMap.get(exp.id), duty, dIdx);
        inserts++;
      } else skipped++;
    }

    // Tech
    for (const [tIdx, tech] of exp.tech.entries()) {
      const techExists = db.prepare('SELECT 1 FROM experience_tech WHERE experience_id = ? AND name = ?').get(expIdMap.get(exp.id), tech);
      if (!techExists) {
        if (!dryRun) db.prepare(`INSERT INTO experience_tech (experience_id, name, sort) VALUES (?, ?, ?)`).run(expIdMap.get(exp.id), tech, tIdx);
        inserts++;
      } else skipped++;
    }
  }

  // Experience-Project links
  if (source.experienceProjects) {
    for (const { experience, projects: projs } of source.experienceProjects) {
      const expId = expIdMap.get(experience);
      if (!expId) continue;
      for (const projKey of projs) {
        const projRow = db.prepare('SELECT id FROM projects WHERE key = ?').get(projKey);
        if (projRow) {
          const linkExists = db.prepare('SELECT 1 FROM experience_projects WHERE experience_id = ? AND project_id = ?').get(expId, projRow.id);
          if (!linkExists) {
            if (!dryRun) db.prepare(`INSERT OR IGNORE INTO experience_projects (experience_id, project_id) VALUES (?, ?)`).run(expId, projRow.id);
            inserts++;
          } else skipped++;
        }
      }
    }
  }
}

// ===== PROJECTS & RELATED =====
if (source.projects) {
  for (const proj of source.projects) {
    const exists = db.prepare('SELECT id FROM projects WHERE key = ?').get(proj.id);
    if (!exists) {
      const id = !dryRun ? db.prepare(`INSERT INTO projects (key, icon, title, description, sort) VALUES (?, ?, ?, ?, 0)`).run(proj.id, proj.icon, proj.title, proj.description).lastInsertRowid : 0;
      if (!dryRun) {
        // Features
        proj.features.forEach((f, i) => db.prepare(`INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)`).run(id, f, i));
        // Tech
        proj.tech.forEach((t, i) => db.prepare(`INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)`).run(id, t, i));
        // Links
        proj.links.forEach((l, i) => db.prepare(`INSERT INTO project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)`).run(id, l.label, l.icon, l.url, i));
      }
      inserts++;
    } else if (updateExisting) {
      // Update project fields
      if (!dryRun) db.prepare(`UPDATE projects SET icon=?, title=?, description=? WHERE key=?`).run(proj.icon, proj.title, proj.description, proj.id);
      updates++;
    } else skipped++;
  }
}

// ===== PERSONAL PROJECTS =====
if (source.personalProjects) {
  for (const proj of source.personalProjects) {
    const exists = db.prepare('SELECT id FROM personal_projects WHERE key = ?').get(proj.id);
    if (!exists) {
      const id = !dryRun ? db.prepare(`INSERT INTO personal_projects (key, icon, title, description, sort) VALUES (?, ?, ?, ?, 0)`).run(proj.id, proj.icon, proj.title, proj.description).lastInsertRowid : 0;
      if (!dryRun) {
        proj.features.forEach((f, i) => db.prepare(`INSERT INTO personal_project_features (project_id, text, sort) VALUES (?, ?, ?)`).run(id, f, i));
        proj.tech.forEach((t, i) => db.prepare(`INSERT INTO personal_project_tech (project_id, name, sort) VALUES (?, ?, ?)`).run(id, t, i));
        proj.links.forEach((l, i) => db.prepare(`INSERT INTO personal_project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)`).run(id, l.label, l.icon, l.url, i));
      }
      inserts++;
    } else if (updateExisting) {
      if (!dryRun) db.prepare(`UPDATE personal_projects SET icon=?, title=?, description=? WHERE key=?`).run(proj.icon, proj.title, proj.description, proj.id);
      updates++;
    } else skipped++;
  }
}

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Sync complete:`);
console.log(`  Inserts: ${inserts}`);
console.log(`  Updates: ${updates}`);
console.log(`  Skipped (already exist): ${skipped}`);
if (dryRun) console.log('\nRun with --apply to apply changes.');
if (!updateExisting && !dryRun) console.log('Run with --update to also modify existing rows.');