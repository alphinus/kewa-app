-- Fix German umlaut substitutions in existing database records
-- Replaces ae/oe/ue with proper ä/ö/ü in user-visible text fields

-- Fix units: "Gesamtes Gebaeude" → "Gesamtes Gebäude"
UPDATE units SET name = REPLACE(name, 'Gebaeude', 'Gebäude') WHERE name LIKE '%Gebaeude%';

-- Fix projects: German text in name and description
UPDATE projects SET
  name = REPLACE(REPLACE(REPLACE(REPLACE(name,
    'Kueche', 'Küche'),
    'Rueckbau', 'Rückbau'),
    'Kuechengeraete', 'Küchengeräte'),
    'Kuechenmoebel', 'Küchenmöbel')
WHERE name LIKE '%ueche%' OR name LIKE '%ueck%' OR name LIKE '%oebel%' OR name LIKE '%eraete%';

UPDATE projects SET
  description = REPLACE(REPLACE(REPLACE(description,
    'Kueche', 'Küche'),
    'Kuechen', 'Küchen'),
    'Rueckbau', 'Rückbau')
WHERE description LIKE '%ueche%' OR description LIKE '%ueck%';

-- Fix template names and descriptions
UPDATE templates SET
  name = REPLACE(REPLACE(REPLACE(name,
    'Kuechen', 'Küchen'),
    'Kueche', 'Küche'),
    'Kuechenmontage', 'Küchenmontage')
WHERE name LIKE '%ueche%' OR name LIKE '%uechenmontage%';

UPDATE templates SET
  description = REPLACE(REPLACE(REPLACE(REPLACE(description,
    'Kuechen', 'Küchen'),
    'Kueche', 'Küche'),
    'Sanitaer', 'Sanitär'),
    'Moebel', 'Möbel')
WHERE description LIKE '%ueche%' OR description LIKE '%aer%' OR description LIKE '%oebel%';

-- Fix template phases
UPDATE template_phases SET
  name = REPLACE(REPLACE(REPLACE(name,
    'Rueckbau', 'Rückbau'),
    'Kueche', 'Küche'),
    'Kuechenmontage', 'Küchenmontage')
WHERE name LIKE '%ueck%' OR name LIKE '%ueche%';

-- Fix template tasks
UPDATE template_tasks SET
  name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name,
    'Kuechengeraete', 'Küchengeräte'),
    'Kuechenmoebel', 'Küchenmöbel'),
    'Kueche', 'Küche'),
    'moebel', 'möbel'),
    'Sanitaerobjekte', 'Sanitärobjekte')
WHERE name LIKE '%ueche%' OR name LIKE '%oebel%' OR name LIKE '%aerobjekte%';

-- Fix quality gates
UPDATE quality_gates SET
  name = REPLACE(REPLACE(name,
    'Kueche', 'Küche'),
    'Maengel', 'Mängel')
WHERE name LIKE '%ueche%' OR name LIKE '%aengel%';

-- Fix quality gate checklist items (JSONB)
UPDATE quality_gates SET
  checklist_items = REPLACE(REPLACE(REPLACE(
    checklist_items::TEXT,
    'Sanitaerobjekte', 'Sanitärobjekte'),
    'funktionsfaehig', 'funktionsfähig'),
    'Maengel', 'Mängel')::JSONB
WHERE checklist_items::TEXT LIKE '%aerobjekte%'
   OR checklist_items::TEXT LIKE '%sfaehig%'
   OR checklist_items::TEXT LIKE '%aengel%';

-- Fix ticket messages
UPDATE ticket_messages SET
  content = REPLACE(REPLACE(content,
    'Kueche', 'Küche'),
    'fuer', 'für')
WHERE content LIKE '%ueche%' OR content LIKE '% fuer %';

-- Fix tickets
UPDATE tickets SET
  description = REPLACE(REPLACE(description,
    'Kueche', 'Küche'),
    'fuer', 'für')
WHERE description LIKE '%ueche%' OR description LIKE '% fuer %';

-- Fix SQL comments on tables (informational only, won't affect app)
COMMENT ON TABLE templates IS 'Seeded with 3 starter templates: Komplett-Renovation, Bad, Küche';
COMMENT ON TABLE projects IS 'Work projects within a unit (e.g., Badezimmer, Küche)';
