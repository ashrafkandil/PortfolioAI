const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'server', 'data', 'portfolio.db');
const db = new DatabaseSync(dbPath);

console.log('Updating projects from Projects.docx data...');

// Project data from Projects.docx
const projects = [
  {
    key: 'Bedrock',
    sort: 0,
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
  {
    key: 'eim-fasat',
    sort: 1,
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
    tech: ['C#', 'ASP.NET', 'Microsoft SQL Server', 'Windows Communication Foundation (WCF)', 'COM+', 'Transact-SQL (T_SQL)', 'VB.NET']
  },
  {
    key: 'crm-platfrom',
    sort: 2,
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
    tech: ['C#', '.NET', 'ASP.NET', 'Windows Communication Foundation (WCF)', 'JavaScript', 'jQuery', 'Microsoft SQL Server', 'Transact-SQL (T_SQL)', 'Sybase SQL Anywhere']
    ],
  },
  {
    key: 'Locus-platfrom',
      sort: 3,
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
    tech: ['C#', '.NET', 'Transact-SQL (T_SQL)', 'Microsoft SQL Server', 'ASP.NET', 'Windows Communication Foundation (WCF)', 'Language Integrated Query (LINQ)', 'Entity Framework', 'Service-Oriented Architecture (SOA)']
    ],
  {
    key: 'Boss-platfrom',
      sort: 4,
      icon: 'fas fa-cogs',
    title: 'BOSS -- U.S. Brokerage Consolidation Platform',
      description: 'U.S. Customs Brokerage Operations. Enterprise platform that consolidated distributed U.S. brokerage systems into a common operating environment for managing customs-entry and shipment-processing activities. The platform standardized brokerage workflows, centralized operational information, and provided teams with consistent access to customer, shipment, document, and compliance records.',
      features: [
      'Consolidated management of importer, customer, shipment, and customs-entry information across U.S. brokerage operations.',
      'Standardized workflows for receiving, reviewing, validating, and processing U.S. customs-entry data.',
      'Support for customs filing activities, duty and tax information, and regulatory compliance requirements.',
      'Centralized electronic document management for invoices, entry records, supporting evidence, and brokerage correspondence.',
      'Common processing and review procedures that improved consistency across brokerage teams and operating locations.',
      'Operational visibility into entry status, exceptions, pending actions, and historical brokerage activity.'
      ],
      tech: ['C#', '.NET', 'Windows Communication Foundation (WCF)', 'WPF', 'Service-Oriented Architecture (SOA)', 'Microsoft SQL Server', 'Entity Framework', 'Language Integrated Query (LINQ)', 'Transact-SQL (T_SQL)', 'Model-view-viewmodel (MVVM)']
  },
  {
    key: 'Fusion-platfrom',
    sort: 5,
      icon: 'fas fa-bolt',
      title: 'FUSION -- Futures Execution, Allocation & Clearing Platform',
      description: 'Manage the end-to-end institutional futures execution-to-clearing workflow by automating futures trade processing, supporting client allocations, and feeding allocated trades into operations trade-matching systems for straight-through post-trade processing.',
      features: [
      'Real-time intake and processing of institutional futures orders across global derivatives markets.',
      'Automated order validation, workflow routing, execution, and trade-status management.',
      'Support for execution strategies designed to balance price, timing, market impact, and execution objectives.',
      'Client allocation of block and aggregated trades across individual institutional accounts based on predefined allocation rules and client instructions.',
      'Straight-through processing from order initiation through execution confirmation, allocation, and clearing handoff.',
      'Exception handling, trade reconciliation, operational monitoring, and audit visibility for execution and post-trade activities.'
    ],
    tech: ['C#', '.NET', 'Microsoft SQL Server', 'WPF', 'DevExpress', 'PRISM 4.0', 'FIX Protocol', 'Microservices architecture', 'Multithreaded processing']
    }
];

const db = require('better-sqlite3')('./server/data/portfolio.db');

console.log('Updating projects from Projects.docx data...\n');

const updateStmt = db.prepare('UPDATE projects SET icon = ?, title = ?, description = ?, sort = ? WHERE key = ?');
const delFeatures = db.prepare('DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const delTech = db.prepare('DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const delLinks = db.prepare('DELETE FROM project_links WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const delExpProjects = db.prepare('DELETE FROM experience_projects WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const delFeaturesSql = db.prepare('DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = ?)');
const delTechStmt = db.prepare('DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = ?)');

const insertFeature = db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)');
const insertTech = db.prepare('INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)');
const selectId = db.prepare('SELECT id FROM projects WHERE key = ?');

for (const proj of projects) {
  console.log(`\nUpdating ${proj.key} (sort ${proj.sort})...`);

  const exists = db.prepare('SELECT id FROM projects WHERE key = ?').get(project.key);

  if (!exists) {
    console.log(`  Project ${proj.key} not found, skipping...`);
      continue;
    }

  const projectId = exists.id;

  // Update project
  const update = db.prepare('UPDATE projects SET icon = ?, title = ?, description = ?, sort = ? WHERE key = ?');
  update.run(project.icon, project.title, project.description, project.sort, project.key);

  // Delete and re-add features
  project.features.forEach((f, i) => db.prepare('INSERT INTO project_features (project_id, text, sort) VALUES (?, ?, ?)').run(projectId, f, i));

  // Delete and re-add tech
  const techStmt = db.prepare('DELETE FROM project_tech WHERE project_id = ?');
  project.tech.forEach((t, i) => db.prepare('INSERT INTO project_tech (project_id, name, sort) VALUES (?, ?, ?)').run(projectId, t, i));

  console.log(`  ✓ ${project.key}: ${data.title}`);
}

// Verify
console.log('\nVerification:');
console.log('=====');
const verify = db.prepare('SELECT p.key, p.title, p.description, p.icon, p.sort, COUNT(DISTINCT pf.id) as fc, COUNT(DISTINCT pt.id) as tc FROM projects p LEFT JOIN project_features pf ON pf.project_id = p.id LEFT JOIN project_tech pt ON pt.project_id = p.id GROUP BY p.id ORDER BY p.sort');
const results = verify.all();
results.forEach(r => console.log(`  ${r.key}: ${r.title} (${r.fc} features, ${r.techCount || 0} tech) | ${r.description.substring(0,80)}...`));

console.log('\n✅ All updates complete!');
process.exit(0);