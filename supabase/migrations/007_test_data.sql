-- Test data for archiving feature testing
-- This migration adds sample projects and tasks

-- First, get unit IDs (we need to reference them)
-- Using a DO block to handle the dynamic unit lookup

DO $$
DECLARE
  unit_eg_links UUID;
  unit_waschkueche UUID;
  project_bad UUID;
  project_kueche UUID;
  project_wasch UUID;
BEGIN
  -- Get unit IDs
  SELECT id INTO unit_eg_links FROM units WHERE name = 'EG Links' LIMIT 1;
  SELECT id INTO unit_waschkueche FROM units WHERE name = 'Waschkueche' LIMIT 1;

  -- Skip if units not found
  IF unit_eg_links IS NULL THEN
    RAISE NOTICE 'Units not found, skipping test data';
    RETURN;
  END IF;

  -- Create test projects
  INSERT INTO projects (id, unit_id, name, description, status, visible_to_imeri)
  VALUES
    ('00000000-0000-0000-0002-000000000001', unit_eg_links, 'Badezimmer Renovation', 'Komplette Renovation des Badezimmers', 'active', true),
    ('00000000-0000-0000-0002-000000000002', unit_eg_links, 'Kueche Reparatur', 'Kleine Reparaturen in der Kueche', 'active', true),
    ('00000000-0000-0000-0002-000000000003', unit_waschkueche, 'Waschmaschine Wartung', 'Jaehrliche Wartung der Waschmaschinen', 'active', true)
  ON CONFLICT (id) DO NOTHING;

  project_bad := '00000000-0000-0000-0002-000000000001';
  project_kueche := '00000000-0000-0000-0002-000000000002';
  project_wasch := '00000000-0000-0000-0002-000000000003';

  -- Create test tasks
  -- Badezimmer: 2 completed tasks (can be archived)
  INSERT INTO tasks (project_id, title, description, status, priority, completed_at)
  VALUES
    (project_bad, 'Fliesen ersetzen', 'Defekte Fliesen im Duschbereich ersetzen', 'completed', 'high', NOW() - INTERVAL '2 days'),
    (project_bad, 'Silikon erneuern', 'Altes Silikon entfernen und neu auftragen', 'completed', 'normal', NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- Kueche: 1 open, 1 completed (cannot be archived)
  INSERT INTO tasks (project_id, title, description, status, priority, due_date)
  VALUES
    (project_kueche, 'Wasserhahn reparieren', 'Tropfender Wasserhahn', 'open', 'urgent', CURRENT_DATE + 3),
    (project_kueche, 'Schranktuer einstellen', 'Schranktuer haengt schief', 'completed', 'low', NULL)
  ON CONFLICT DO NOTHING;

  -- Waschkueche: All completed (can be archived)
  INSERT INTO tasks (project_id, title, description, status, priority, completed_at)
  VALUES
    (project_wasch, 'Filter reinigen', 'Flusenfilter aller Maschinen reinigen', 'completed', 'normal', NOW() - INTERVAL '3 days'),
    (project_wasch, 'Schlaeuche pruefen', 'Zu- und Abflusschlaeuche kontrollieren', 'completed', 'normal', NOW() - INTERVAL '3 days'),
    (project_wasch, 'Dichtungen pruefen', 'Tuerdichtungen auf Verschleiss pruefen', 'completed', 'normal', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Test data created: 3 projects, 7 tasks';
END $$;
