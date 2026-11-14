/**
 * Update projects in DB with detailed data from Projects.docx
 * Matches by project key (id from DB)
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'server', 'data', 'portfolio.db');
const target = new DatabaseSync(dbPath);

console.log('Updating projects with detailed data from Projects.docx...');

// Detailed data from Projects.docx for the first 6 projects
const projectData = {
  'Bedrock': {
    icon: 'fas fa-building',
    title: 'Bedrock - Life Insurance Administration System',
    description: 'Policy administration, Premium billing, and Claims processing. Supports the complete life insurance lifecycle, from application submission and risk assessment to policy servicing and beneficiary payments.',
    features: [
        'Digital application intake with customer, health, financial, and beneficiary information.',
        'Automated underwriting workflows and risk assessment support.',
        'Medical-document and external verification integration',
        'Policy issuance with premium calculation, coverage, riders, and exclusions'
    ],
    tech: ['C#', '.NET', 'Delphi', 'XML', 'COM+', 'TSQL', 'Sql Server']
  },
  'eim-fasat': {
    icon: 'fas fa-money-bill-transfer',
    title: 'EIM/FASAT - Insurance Compensation and Commission Management System',
    description: 'Policy administration, premium billing, and claims processing platform supporting the complete life insurance lifecycle from application submission and underwriting to policy servicing, commission management, and beneficiary payments.',
    features: [
        'Digital application intake capturing customer, health, financial, and beneficiary information.',
        'Automated underwriting workflows supporting risk assessment and straight-through processing.',
        'Integration with medical-document and external verification services.',
        'Policy issuance with premium calculation, coverage limits, riders, and exclusions.',
        'Premium billing, payment reconciliation, and grace-period management.',
        'Claims validation and beneficiary payout processing.',
        'Agent commission calculation based on enterprise incentive-management rules.'
    ],
    tech: ['C#', 'ASP.NET', 'Microsoft SQL Server', 'Windows Communication Foundation (WCF)', 'COM+', 'Transact-SQL (T-SQL)', 'VB.NET']
  },
  'crm-platfrom': {
    icon: 'fas fa-users',
    title: 'Client Relationship & Trading Account Administration Platform',
    description: 'Client-facing and internal CRM platform supporting trading account administration, customer profile management, and service request processing for an online brokerage. The platform enabled customer-service and operations teams to manage client information and resolve account-related requests throughout their lifecycle.',
    features: [
        'Trading account administration, including the maintenance and servicing of client account information.',
        'Centralized customer profiles containing client details and account-related information.',
        'Service-request creation, categorization, assignment, tracking, and resolution.',
        'Workflow support for handling account maintenance requests and customer inquiries.',
        'Visibility into request status, ownership, history, and follow-up activities.',
        'Consistent and secure management of customer and trading-account records.'
    ],
    tech: ['C#', '.NET', 'ASP.NET', 'Windows Communication Foundation (WCF)', 'JavaScript', 'jQuery', 'Microsoft SQL Server', 'Transact-SQL (T-SQL)', 'Sybase SQL Anywhere']
  },
  'Locus-platfrom': {
    icon: 'fas fa-sitemap',
    title: 'LOCUS.Net — Canadian Brokerage Modernization Platform',
    description: 'Canadian Customs Brokerage & Trade Compliance. Enterprise customs brokerage platform supporting Canadian import-entry processing, trade compliance, and cross-border shipment clearance. The platform helped brokerage teams manage import information, validate classification and regulatory data, submit customs entries, and support faster, more accurate release processing.',
    features: [
        'Import shipment and customs-entry intake for commercial invoices, packing lists, origin information, and related trade documentation.',
        'Product and Harmonized System (HS) classification management and validation.',
        'Customs-entry preparation and electronic submission to the Canada Border Services Agency (CBSA).',
        'Validation of declaration, release, duty, tax, and compliance information before submission.',
        'Exception handling and quality-control workflows to identify incomplete or inaccurate data and reduce clearance delays.',
        'Centralized compliance and shipment records supporting operational follow-up, audit readiness, and paperless brokerage processing.'
    ],
    tech: ['C#', '.NET', 'Transact-SQL (T-SQL)', 'Microsoft SQL Server', 'ASP.NET', 'Windows Communication Foundation (WCF)', 'Language Integrated Query (LINQ)', 'Entity Framework', 'Service-Oriented Architecture (SOA)']
  },
  'Boss-platfrom': {
    icon: 'fas fa-cogs',
    title: 'BOSS — U.S. Brokerage Consolidation Platform',
    description: 'U.S. Customs Brokerage Operations. Enterprise platform that consolidated distributed U.S. brokerage systems into a common operating environment for managing customs-entry and shipment-processing activities. The platform standardized brokerage workflows, centralized operational information, and provided teams with consistent access to customer, shipment, document, and compliance records.',
    features: [
        'Consolidated management of importer, customer, shipment, and customs-entry information across U.S. brokerage operations.',
        'Standardized workflows for receiving, reviewing, validating, and processing U.S. customs-entry data.',
        'Support for customs filing activities, duty and tax information, and regulatory compliance requirements.',
        'Centralized electronic document management for invoices, entry records, supporting evidence, and brokerage correspondence.',
        'Common processing and review procedures that improved consistency across brokerage teams and operating locations.',
        'Operational visibility into entry status, exceptions, pending actions, and historical brokerage activity.'
    ],
    tech: ['C#', '.NET', 'Windows Communication Foundation (WCF)', 'WPF', 'Service-Oriented Architecture (SOA)', 'Microsoft SQL Server', 'Entity Framework', 'Language Integrated Query (LINQ)', 'Transact-SQL (T-SQL)', 'Model-view-viewmodel (MVVM)']
  },
  'Fusion-platfrom': {
    icon: 'fas fa-bolt',
    title: 'FUSION — Futures Execution, Allocation & Clearing Platform',
    description: 'Manage the end-to-end institutional futures execution-to-clearing workflow by automating futures trade processing, supporting client allocations, and feeding allocated trades into operations\' trade-matching systems for straight-through post-trade processing.',
    features: [
        'Real-time intake and processing of institutional futures orders across global derivatives markets.',
        'Automated order validation, workflow routing, execution, and trade-status management.',
        'Support for execution strategies designed to balance price, timing, market impact, and execution objectives.',
        'Client allocation of block and aggregated trades across individual institutional accounts based on predefined allocation rules and client instructions.',
        'Straight-through processing from order initiation through execution confirmation, allocation, and clearing handoff.',
        'Exception handling, trade reconciliation, operational monitoring, and audit visibility for execution and post-trade activities.'
    ],
    tech: ['C#', '.NET', 'Microsoft SQL Server', 'WPF', 'DevExpress', 'PRISM 4.0', 'FIX Protocol', 'Microservices architecture', 'Multithreaded processing', 'Multithreaded processing']
    // Note: Multithreaded processing listed twice in source, keeping as-is
  }
};

const db = require('better-sqlite3')(targetPath);

// Use the same connection approach as other scripts
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/data/portfolio.db');

console.log('Connected to database. Updating projects...');

const updateProject = db.prepare(`
    UPDATE projects
    SET icon = ?, title = ?, description = ?, sort = ?
    WHERE key = ?
`);

const deleteFeatures = db.prepare('DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const deleteTech = db.prepare('DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const deleteLinks = db.prepare('DELETE FROM project_links WHERE project_id = (SELECT id FROM projects WHERE key = ?)');

const insertFeature = db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)');
const insertTech = db.prepare('INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)');
const insertLink = db.prepare('INSERT INTO project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)');

function updateProjectData(key, data, sort) {
  const project = db.get('SELECT id FROM projects WHERE key = ?', key);
  if (!project) {
    console.log(`Project ${key} not found, skipping...`);
    return;
  }

  console.log(`Updating project: ${key} (ID: ${project.id})`);

  // Update project
  const stmt = db.prepare('UPDATE projects SET icon = ?, title = ?, description = ?, sort = ? WHERE key = ?');

  db.prepare('UPDATE projects SET icon = ?, title = ?, description = ?, sort = ? WHERE key = ?').run(
    data.icon, data.title, data.description, sort, key
  );

  // Update features
  if (data.features) {
    db.prepare('DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = ?)').run(key);
    const pf = db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)');
      .projectId ? db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)'): null;
    const pfStmt = db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)');
    data.features.forEach((f, i) => pfStmt.run(project.id, f, i));
  }

  // Update tech
  const techStmt = db.prepare('INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)');
  db.prepare('DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = ?)').run(key);
  if (data.tech) {
    data.tech.forEach((t, i) => db.prepare('INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)')
      .run(project.id, t, i));
  }

  // Update links (clear and re-add if provided)
  if (data.links) {
    db.prepare('DELETE FROM project_links WHERE project_id = (SELECT id FROM projects WHERE key = ?)').run(key);
    const linkStmt = db.prepare('INSERT INTO project_links (project_id, label, icon, url, sort) VALUES (?, ?, ?, ?, ?)');
    data.links.forEach((l, i) => linkStmt.run(project.id, l.label, l.icon, l.url, i));
  }

  console.log(`  Updated: ${data.title}`);
}

// Update the first 6 projects
console.log('Updating project data from Projects.docx...\n');
updateProjectData('Bedrock', {
  icon: 'fas fa-building',
  title: 'Bedrock - Life Insurance Administration System',
  description: 'Policy administration, Premium billing, and Claims processing. Supports the complete life insurance lifecycle, from application submission and risk assessment to policy servicing and beneficiary payments.',
  features: [
      'Digital application intake with customer, health, financial, and beneficiary information.',
      'Automated underwriting workflows and risk assessment support.',
      'Medical-document and external verification integration',
      'Policy issuance with premium calculation, coverage, riders, and exclusions'
  ],
  tech: ['C#', '.NET', 'Delphi', 'XML', 'COM+', 'TSQL', 'Sql Server']
}, 0);

updateProjectData('eim-fasat', {
  icon: 'fas fa-money-bill-transfer',
  title: 'EIM/FASAT - Insurance Compensation and Commission Management System',
  description: 'Policy administration, premium billing, and claims processing platform supporting the complete life insurance lifecycle from application submission and underwriting to policy servicing, commission management, and beneficiary payments.',
  features: [
      'Digital application intake capturing customer, health, financial, and beneficiary information.',
      'Automated underwriting workflows supporting risk assessment and straight-through processing.',
      'Integration with medical-document and external verification services.',
      'Policy issuance with premium calculation, coverage limits, riders, and exclusions.',
      'Premium billing, payment reconciliation, and grace-period management.',
      'Claims validation and beneficiary payout processing.',
      'Agent commission calculation based on enterprise incentive-management rules.'
  ],
  tech: ['C#', 'ASP.NET', 'Microsoft SQL Server', 'Windows Communication Foundation (WCF)', 'COM+', 'Transact-SQL (T-SQL)', 'VB.NET']
}, 1);

updateProjectData('crm-platfrom', {
  icon: 'fas fa-users',
  title: 'Client Relationship & Trading Account Administration Platform',
  description: 'Client-facing and internal CRM platform supporting trading account administration, customer profile management, and service request processing for an online brokerage. The platform enabled customer-service and operations teams to manage client information and resolve account-related requests throughout their lifecycle.',
  features: [
      'Trading account administration, including the maintenance and servicing of client account information.',
      'Centralized customer profiles containing client details and account-related information.',
      'Service-request creation, categorization, assignment, tracking, and resolution.',
      'Workflow support for handling account maintenance requests and customer inquiries.',
      'Visibility into request status, ownership, history, and follow-up activities.',
      'Consistent and secure management of customer and trading-account records.'
  ],
  tech: ['C#', '.NET', 'ASP.NET', 'Windows Communication Foundation (WCF)', 'JavaScript', 'jQuery', 'Microsoft SQL Server', 'Transact-SQL (T-SQL)', 'Sybase SQL Anywhere']
}, 2);

updateProjectData('Locus-platfrom', {
  icon: 'fas fa-sitemap',
  title: 'LOCUS.net — Canadian Brokerage Modernization Platform',
  description: 'Canadian Customs Brokerage & Trade Compliance. Enterprise customs brokerage platform supporting Canadian import-entry processing, trade compliance, and cross-border shipment clearance. The platform helped brokerage teams manage import information, validate classification and regulatory data, submit customs entries, and support faster, more accurate release processing.',
  features: [
      'Import shipment and customs-entry intake for commercial invoices, packing lists, origin information, and related trade documentation.',
      'Product and Harmonized System (HS) classification management and validation.',
      'Customs-entry preparation and electronic submission to the Canada Border Services Agency (CBSA).',
      'Validation of declaration, release, duty, tax, and compliance information before submission.',
      'Exception handling and quality-control workflows to identify incomplete or inaccurate data and reduce clearance delays.',
      'Centralized compliance and shipment records supporting operational follow-up, audit readiness, and paperless brokerage processing.'
  ],
  tech: ['C#', '.NET', 'Transact-SQL (T-SQL)', 'Microsoft SQL Server', 'ASP.NET', 'Windows Communication Foundation (WCF)', 'Language Integrated Query (LINQ)', 'Entity Framework', 'Service-Oriented Architecture (SOA)']
}, 3);

updateProjectData('Boss_platfrom', {
  icon: 'fas fa-cogs',
  title: 'BOSS — U.S. Brokerage Consolidation Platform',
  description: 'U.S. Customs Brokerage Operations. Enterprise platform that consolidated distributed U.S. brokerage systems into a common operating environment for managing customs-entry and shipment-processing activities. The platform standardized brokerage workflows, centralized operational information, and provided teams with consistent access to customer, shipment, document, and compliance records.',
  features: [
      'Consolidated management of importer, customer, shipment, and customs-entry information across U.S. brokerage operations.',
      'Standardized workflows for receiving, reviewing, validating, and processing U.S. customs-entry data.',
      'Support for customs filing activities, duty and tax information, and regulatory compliance requirements.',
      'Centralized electronic document management for invoices, entry records, supporting evidence, and brokerage correspondence.',
      'Common processing and review procedures that improved consistency across brokerage teams and operating locations.',
      'Operational visibility into entry status, exceptions, pending actions, and historical brokerage activity.'
  ],
  tech: ['C#', '.NET', 'Windows Communication Foundation (WCF)', 'WPF', 'Service-Oriented Architecture (SOA)', 'Microsoft SQL Server', 'Entity Framework', 'Language Integrated Query (LINQ)', 'Transact-SQL (T-SQL)', 'Model-view-viewmodel (MVVM)']
}, 4);

updateProjectData('Fusion_platfrom', {
  icon: 'fas fa-bolt',
  title: 'FUSION — Futures Execution, Allocation & Clearing Platform',
  description: 'Manage the end-to-end institutional futures execution-to-clearing workflow by automating futures trade processing, supporting client allocations, and feeding allocated trades into operations\' trade-matching systems for straight-through post-trade processing.',
  features: [
      'Real-time intake and processing of institutional futures orders across global derivatives markets.',
      'Automated order validation, workflow routing, execution, and trade-status management.',
      'Support for execution strategies designed to balance price, timing, market impact, and execution objectives.',
      'Client allocation of block and aggregated trades across individual institutional accounts based on predefined allocation rules and client instructions.',
      'Straight-through processing from order initiation through execution confirmation, allocation, and clearing handoff.',
      'Exception handling, trade reconciliation, operational monitoring, and audit visibility for execution and post-trade activities.'
  ],
  tech: ['C#', '.NET', 'Microsoft SQL Server', 'WPF', 'DevExpress', 'PRISM 4.0', 'FIX Protocol', 'Microservices architecture', 'Multithreaded processing']
}, 5);

console.log('\nAll updates complete!');
console.log('Verification:');
console.log('=====');

['Bedrock', 'eim-fasat', 'crm-platfrom', 'Locus-platfrom', 'Boss_platfrom', 'Fusion_platfrom'].forEach(key => {
  const p = db.get('SELECT id, title, description FROM projects WHERE key = ?', key);
  const fc = db.prepare('SELECT count(*) as c FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = ?)').get(key)?.c || 0;
  const tc = db.prepare('SELECT count(*) as c FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = ?)').get(key)?.c || 0;
  console.log(`  ${key}: ${p?.title || 'NOT FOUND'} | features: ${fc} | tech: ${tc}`);
});

console.log('\nDone!');