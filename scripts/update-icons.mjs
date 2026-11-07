import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'server', 'data', 'portfolio.db');
const db = new DatabaseSync(dbPath);

// Chosen icons, reviewed against each project's description and key features.
// Replaces icons that were too generic or mismatched (e.g. a brain for a
// customs brokerage platform, a shield-halved for an insurance admin system).
const iconMap = {
  // --- Featured projects (projects table) ---
  Bedrock: 'fas fa-building', // Life insurance administration system: policy/billing/claims building
  'eim-fasat': 'fas fa-exchange-alt', // Commission & incentive management: money exchange
  'crm-platfrom': 'fas fa-users', // Client relationship & trading account administration
  'Locus-platfrom': 'fas fa-shipping-fast', // Customs brokerage: cross-border shipment clearance
  'Boss-platfrom': 'fas fa-cogs', // Brokerage consolidation: distributed systems into one operating environment
  'Fusion-platfrom': 'fas fa-bolt', // Futures execution, allocation & clearing: real-time trade processing
  'Markett-Data': 'fas fa-gauge-high', // Market data governance: quality monitoring & validation
  'Commodities-Desktop': 'fas fa-oil-well', // Commodities trading, risk & operations workspace
  'Pdb-Scraper': 'fas fa-plug', // Market data integration hub connecting many data sources
  'Edata-Feed': 'fas fa-stream', // Electricity market data pipeline: continuous data flow

  // --- Personal projects (personal_projects table) ---
  'crazycakes-ai': 'fas fa-cake-candles', // AI bakery website (unchanged)
  'crazycakes-mobile': 'fas fa-mobile-alt', // Mobile app (unchanged)
  'portfolio-ai': 'fas fa-robot', // AI portfolio with talking avatar (unchanged)
};

let updated = 0;
const updateStmt = db.prepare('UPDATE projects SET icon = ? WHERE key = ?');
const updatePersonalStmt = db.prepare('UPDATE personal_projects SET icon = ? WHERE key = ?');

for (const [key, icon] of Object.entries(iconMap)) {
  const info = updateStmt.run(icon, key);
  if (info.changes > 0) updated++;
  const info2 = updatePersonalStmt.run(icon, key);
  if (info2.changes > 0) updated++;
}

db.close();
console.log(`Updated ${updated} project icon(s) in ${dbPath}`);