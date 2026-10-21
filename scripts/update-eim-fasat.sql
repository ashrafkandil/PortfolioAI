-- Replace the second project (fitness-app) with EIM/FASAT.
-- Safe to re-run after the project has already been renamed to eim-fasat.
-- Run against the source SQLite database after making a backup.

PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

-- Older source databases may predate the project/experience relationship.
CREATE TABLE IF NOT EXISTS experience_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE (experience_id, project_id)
);

-- Abort before changing data unless there is exactly one target project,
-- it is still second in display order, and the SunGard experience exists.
CREATE TEMP TABLE _eim_fasat_preflight (
  valid INTEGER NOT NULL CHECK (valid = 1)
);

INSERT INTO _eim_fasat_preflight (valid)
SELECT CASE
  WHEN (
    SELECT COUNT(*)
    FROM projects
    WHERE key IN ('fitness-app', 'eim-fasat')
  ) = 1
  AND (
    SELECT sort
    FROM projects
    WHERE key IN ('fitness-app', 'eim-fasat')
  ) = 1
  AND EXISTS (
    SELECT 1
    FROM experiences
    WHERE key = 'sungard'
  )
  THEN 1
  ELSE 0
END;

UPDATE projects
SET key = 'eim-fasat',
    icon = 'fas fa-money-bill-transfer',
    title = 'Insurance Compensation & Incentive Management (EIM/FASAT)',
    description = 'An enterprise insurance platform for compensation and incentive management across multiple product lines. Developed and maintained at SunGard, it combined legacy components with .NET applications and SQL Server-based data processing.'
WHERE key IN ('fitness-app', 'eim-fasat');

DELETE FROM project_features
WHERE project_id = (SELECT id FROM projects WHERE key = 'eim-fasat');

WITH features(sort, text) AS (
  VALUES
    (0, 'Supports agent commission and incentive workflows across insurance product lines.'),
    (1, 'Maintains legacy VB6 and COM+ components alongside C# and VB.NET applications.'),
    (2, 'Implements enterprise web applications and services using ASP.NET and WCF.'),
    (3, 'Uses T-SQL, SQL Server, SSIS, and XML for data processing and integrations.')
)
INSERT INTO project_features (project_id, text, sort)
SELECT project.id, features.text, features.sort
FROM projects AS project
CROSS JOIN features
WHERE project.key = 'eim-fasat';

DELETE FROM project_tech
WHERE project_id = (SELECT id FROM projects WHERE key = 'eim-fasat');

WITH technologies(sort, name) AS (
  VALUES
    (0, 'C#'),
    (1, 'VB.NET'),
    (2, 'ASP.NET'),
    (3, 'WCF'),
    (4, 'VB6'),
    (5, 'COM+'),
    (6, 'T-SQL'),
    (7, 'SQL Server'),
    (8, 'SSIS'),
    (9, 'XML')
)
INSERT INTO project_tech (project_id, name, sort)
SELECT project.id, technologies.name, technologies.sort
FROM projects AS project
CROSS JOIN technologies
WHERE project.key = 'eim-fasat';

-- Remove placeholder store links and any old experience associations.
DELETE FROM project_links
WHERE project_id = (SELECT id FROM projects WHERE key = 'eim-fasat');

DELETE FROM experience_projects
WHERE project_id = (SELECT id FROM projects WHERE key = 'eim-fasat');

INSERT INTO experience_projects (experience_id, project_id)
SELECT experience.id, project.id
FROM experiences AS experience
CROSS JOIN projects AS project
WHERE experience.key = 'sungard'
  AND project.key = 'eim-fasat';

DROP TABLE _eim_fasat_preflight;
COMMIT;

-- Confirm the updated project, its position, and its experience association.
SELECT
  project.key,
  project.title,
  project.sort,
  experience.key AS experience_key,
  experience.title AS experience_title,
  experience.company,
  experience.period
FROM projects AS project
LEFT JOIN experience_projects AS link ON link.project_id = project.id
LEFT JOIN experiences AS experience ON experience.id = link.experience_id
WHERE project.key = 'eim-fasat';
