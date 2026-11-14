-- update-from-docx.sql
-- Update projects with detailed data from Projects.docx
-- Run with: sqlite3 "C:\Users\a_kan\Documents\Projects\PortfolioAI\server\data\portfolio.db" < "C:\Users\a_kan\Documents\Projects\PortfolioAI\scripts\update-from-docx.sql"

PRAGMA busy_timeout = 5000;

-- =====================================================================
-- BEDROCK (sort 0) - Life Insurance Administration System
-- =====================================================================
UPDATE projects SET icon = 'fas fa-building', title = 'Bedrock - Life Insurance Administration System', description = 'Policy administration, Premium billing, and Claims processing. Supports the complete life insurance lifecycle, from application submission and risk assessment to policy servicing and beneficiary payments.', sort = 0 WHERE key = 'Bedrock';

DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = 'Bedrock');
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Digital application intake with customer, health, financial, and beneficiary information.', 0 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Automated underwriting workflows and risk assessment support.', 1 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Medical-document and external verification integration', 2 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Policy issuance with premium calculation, coverage, riders, and exclusions', 3 FROM projects WHERE key = 'Bedrock';

DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = 'Bedrock');
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'C#', 0 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_tech (project_id, name, sort) SELECT id, '.NET', 1 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Delphi', 2 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'XML', 3 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'COM+', 4 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'TSQL', 5 FROM projects WHERE key = 'Bedrock';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Sql Server', 6 FROM projects WHERE key = 'Bedrock';

-- =====================================================================
-- EIM-FASAT (sort 1) - Insurance Compensation and Commission Management System
-- =====================================================================
UPDATE projects SET
  icon = 'fas fa-money-bill-transfer',
  title = 'EIM/FASAT - Insurance Compensation and Commission Management System',
  description = 'Policy administration, premium billing, and claims processing platform supporting the complete life insurance lifecycle from application submission and underwriting to policy servicing, commission management, and beneficiary payments.',
  sort = 1
WHERE key = 'eim-fasat';

DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = 'eim-fasat');
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Digital application intake capturing customer, health, financial, and beneficiary information.', 0 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Automated underwriting workflows supporting risk assessment and straight-through processing.', 1 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Integration with medical-document and external verification services.', 2 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Policy issuance with premium calculation, coverage limits, riders, and exclusions.', 3 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Premium billing, payment reconciliation, and grace-period management.', 4 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Claims validation and beneficiary payout processing.', 5 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Agent commission calculation based on enterprise incentive-management rules.', 6 FROM projects WHERE key = 'eim-fasat';

DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = 'eim-fasat');
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'C#', 0 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'ASP.NET', 1 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Microsoft SQL Server', 2 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Windows Communication Foundation (WCF)', 3 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'COM+', 4 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Transact-SQL (T_SQL)', 5 FROM projects WHERE key = 'eim-fasat';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'VB.NET', 6 FROM projects WHERE key = 'eim-fasat';

-- =====================================================================
-- CRM-PLATFROM (sort 2) - Client Relationship & Trading Account Administration Platform
-- =====================================================================
UPDATE projects SET
  icon = 'fas fa-users',
  title = 'Client Relationship & Trading Account Administration Platform',
  description = 'Client-facing and internal CRM platform supporting trading account administration, customer profile management, and service request processing for an online brokerage. The platform enabled customer-service and operations teams to manage client information and resolve account-related requests throughout their lifecycle.',
  sort = 2
WHERE key = 'crm-platfrom';

DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = 'crm-platfrom');
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Trading account administration, including the maintenance and servicing of client account information.', 0 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Centralized customer profiles containing client details and account-related information.', 1 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Service-request creation, categorization, assignment, tracking, and resolution.', 2 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Workflow support for handling account maintenance requests and customer inquiries.', 3 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Visibility into request status, ownership, history, and follow-up activities.', 4 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Consistent and secure management of customer and trading-account records.', 5 FROM projects WHERE key = 'crm-platfrom';

DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = 'crm-platfrom');
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'C#', 0 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, '.NET', 1 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'ASP.NET', 2 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Windows Communication Foundation (WCF)', 3 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'JavaScript', 4 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'jQuery', 5 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Microsoft SQL Server', 6 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Transact-SQL (T_SQL)', 7 FROM projects WHERE key = 'crm-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Sybase SQL Anywhere', 8 FROM projects WHERE key = 'crm-platfrom';

-- =====================================================================
-- LOCUS-PLATFROM (sort 3) - Canadian Brokerage Modernization Platform
-- =====================================================================
UPDATE projects SET
  icon = 'fas fa-sitemap',
  title = 'LOCUS.NET -- Canadian Brokerage Modernization Platform',
  description = 'Canadian Customs Brokerage & Trade Compliance. Enterprise customs brokerage platform supporting Canadian import-entry processing, trade compliance, and cross-border shipment clearance. The platform helped brokerage teams manage import information, validate classification and regulatory data, submit customs entries, and support faster, more accurate release processing.',
  sort = 3
WHERE key = 'Locus-platfrom';

DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = 'Locus-platfrom');
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Import shipment and customs-entry intake for commercial invoices, packing lists, origin information, and related trade documentation.', 0 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Product and Harmonized System (HS) classification management and validation.', 1 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Customs-entry preparation and electronic submission to the Canada Border Services Agency (CBSA).', 2 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Validation of declaration, release, duty, tax, and compliance information before submission.', 3 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Exception handling and quality-control workflows to identify incomplete or inaccurate data and reduce clearance delays.', 4 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Centralized compliance and shipment records supporting operational follow-up, audit readiness, and paperless brokerage processing.', 5 FROM projects WHERE key = 'Locus-platfrom';

DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = 'Locus-platfrom');
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'C#', 0 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, '.NET', 1 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Transact-SQL (T_SQL)', 2 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Microsoft SQL Server', 3 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'ASP.NET', 4 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Windows Communication Foundation (WCF)', 5 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Language Integrated Query (LINQ)', 6 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Entity Framework', 6 FROM projects WHERE key = 'Locus-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Service-Oriented Architecture (SOA)', 7 FROM projects WHERE key = 'Locus-platfrom';

-- =====================================================================
-- BOSS-PLATFROM (sort 4) - U.S. Brokerage Consolidation Platform
-- =====================================================================
UPDATE projects SET
  icon = 'fas fa-cogs',
  title = 'BOSS -- U.S. Brokerage Consolidation Platform',
  description = 'U.S. Customs Brokerage Operations. Enterprise platform that consolidated distributed U.S. brokerage systems into a common operating environment for managing customs-entry and shipment-processing activities. The platform standardized brokerage workflows, centralized operational information, and provided teams with consistent access to customer, shipment, document, and compliance records.',
  sort = 4
WHERE key = 'Boss-platfrom';

DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = 'Boss-platfrom');
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Consolidated management of importer, customer, shipment, and customs-entry information across U.S. brokerage operations.', 0 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Standardized workflows for receiving, reviewing, validating, and processing U.S. customs-entry data.', 1 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Support for customs filing activities, duty and tax information, and regulatory compliance requirements.', 2 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Centralized electronic document management for invoices, entry records, supporting evidence, and brokerage correspondence.', 3 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Common processing and review procedures that improved consistency across brokerage teams and operating locations.', 4 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Operational visibility into entry status, exceptions, pending actions, and historical brokerage activity.', 5 FROM projects WHERE key = 'Boss-platfrom';

DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = 'Boss-platfrom');
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'C#', 0 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, '.NET', 1 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Windows Communication Foundation (WCF)', 2 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'WPF', 3 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Service-Oriented Architecture (SOA)', 3 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Microsoft SQL Server', 4 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Entity Framework', 4 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Language Integrated Query (LINQ)', 5 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Transact-SQL (T_SQL)', 5 FROM projects WHERE key = 'Boss-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Model-view-viewmodel (MVVM)', 5 FROM projects WHERE key = 'Boss-platfrom';

-- =====================================================================
-- FUSION-PLATFROM (sort 5) - Futures Execution, Allocation & Clearing Platform
-- =====================================================================
UPDATE projects SET
  icon = 'fas fa-bolt',
  title = 'FUSION -- Futures Execution, Allocation & Clearing Platform',
  description = 'Manage the end-to-end institutional futures execution-to-clearing workflow by automating futures trade processing, supporting client allocations, and feeding allocated trades into operations trade-matching systems for straight-through post-trade processing.',
  sort = 5
WHERE key = 'Fusion-platfrom';

DELETE FROM project_features WHERE project_id = (SELECT id FROM projects WHERE key = 'Fusion-platfrom');
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Real-time intake and processing of institutional futures orders across global derivatives markets.', 0 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Automated order validation, workflow routing, execution, and trade-status management.', 1 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Support for execution strategies designed to balance price, timing, market impact, and execution objectives.', 2 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Client allocation of block and aggregated trades across individual institutional accounts based on predefined allocation rules and client instructions.', 3 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Straight-through processing from order initiation through execution confirmation, allocation, and clearing handoff.', 3 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_features (project_id, text, sort) SELECT id, 'Exception handling, trade reconciliation, operational monitoring, and audit visibility for execution and post-trade activities.', 4 FROM projects WHERE key = 'Fusion-platfrom';

DELETE FROM project_tech WHERE project_id = (SELECT id FROM projects WHERE key = 'Fusion-platfrom');
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'C#', 0 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, '.NET', 1 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Microsoft SQL Server', 1 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'WPF', 2 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'DevExpress', 3 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'PRISM 4.0', 4 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'FIX Protocol', 4 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Microservices architecture', 5 FROM projects WHERE key = 'Fusion-platfrom';
INSERT INTO project_tech (project_id, name, sort) SELECT id, 'Multithreaded processing', 6 FROM projects WHERE key = 'Fusion-platfrom';