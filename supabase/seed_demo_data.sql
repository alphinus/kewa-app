-- =====================================================
-- KEWA Demo Data Seed Script
-- =====================================================
--
-- Swiss-realistic demo data for development/testing
-- IDEMPOTENT: Safe to run multiple times
--
-- Data included:
--   - 5 properties (Liegenschaften) in Zürich and Bern
--   - 15+ buildings across properties
--   - 20+ partners (contractors and suppliers)
--   - 10+ projects with varied statuses
--   - 5 templates for renovation workflows
--
-- To clean up demo data:
-- DELETE FROM renovation_projects WHERE id LIKE '00000000-0000-0000-0000-00000000%';
-- DELETE FROM templates WHERE id LIKE '00000000-0000-0000-0000-00000000%';
-- DELETE FROM partners WHERE id LIKE '00000000-0000-0000-0000-0000000001%';
-- DELETE FROM buildings WHERE id LIKE '00000000-0000-0000-0000-0000000000%';
-- DELETE FROM properties WHERE id LIKE '00000000-0000-0000-0000-0000000000%';
--
-- To run: supabase db execute -f supabase/seed_demo_data.sql
-- =====================================================

DO $$
BEGIN
  -- Idempotency check: skip if demo data already exists
  IF EXISTS (SELECT 1 FROM properties WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    RAISE NOTICE 'Demo data already exists, skipping';
    RETURN;
  END IF;

  -- =====================================================
  -- PROPERTIES (5 Liegenschaften)
  -- =====================================================

  INSERT INTO properties (id, name, address, description, created_at) VALUES
    ('00000000-0000-0000-0000-000000000001',
     'Liegenschaft Limmatstrasse',
     'Limmatstrasse 42, 8005 Zürich',
     'Mehrfamilienhaus mit 12 Wohnungen, Baujahr 1985',
     NOW() - INTERVAL '2 years'),
    ('00000000-0000-0000-0000-000000000002',
     'Liegenschaft Bundesplatz',
     'Bundesplatz 8, 3011 Bern',
     'Geschäfts- und Wohnhaus im Stadtzentrum',
     NOW() - INTERVAL '18 months'),
    ('00000000-0000-0000-0000-000000000003',
     'Wohnanlage Seefeld',
     'Seefeldstrasse 123, 8008 Zürich',
     'Gehobene Wohnanlage mit 3 Gebäuden, Seesicht',
     NOW() - INTERVAL '1 year'),
    ('00000000-0000-0000-0000-000000000004',
     'Mehrfamilienhaus Oerlikon',
     'Affolternstrasse 56, 8050 Zürich',
     'Modernes MFH mit 18 Wohnungen, Baujahr 2010',
     NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-000000000005',
     'Siedlung Wabern',
     'Seftigenstrasse 201, 3084 Wabern',
     'Siedlung mit 4 Reihenhäusern, familienfreundlich',
     NOW() - INTERVAL '3 months');

  -- =====================================================
  -- BUILDINGS (15+ Gebäude)
  -- =====================================================

  -- Limmatstrasse (2 buildings)
  INSERT INTO buildings (id, property_id, name, address, created_at) VALUES
    ('00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000001',
     'Haus A - Vordergebäude',
     'Limmatstrasse 42, 8005 Zürich',
     NOW() - INTERVAL '2 years'),
    ('00000000-0000-0000-0000-000000000012',
     '00000000-0000-0000-0000-000000000001',
     'Haus B - Hintergebäude',
     'Limmatstrasse 42a, 8005 Zürich',
     NOW() - INTERVAL '2 years');

  -- Bundesplatz (3 buildings)
  INSERT INTO buildings (id, property_id, name, address, created_at) VALUES
    ('00000000-0000-0000-0000-000000000021',
     '00000000-0000-0000-0000-000000000002',
     'Hauptgebäude',
     'Bundesplatz 8, 3011 Bern',
     NOW() - INTERVAL '18 months'),
    ('00000000-0000-0000-0000-000000000022',
     '00000000-0000-0000-0000-000000000002',
     'Nebengebäude West',
     'Bundesplatz 8a, 3011 Bern',
     NOW() - INTERVAL '18 months'),
    ('00000000-0000-0000-0000-000000000023',
     '00000000-0000-0000-0000-000000000002',
     'Nebengebäude Ost',
     'Bundesplatz 8b, 3011 Bern',
     NOW() - INTERVAL '18 months');

  -- Seefeld (3 buildings)
  INSERT INTO buildings (id, property_id, name, address, created_at) VALUES
    ('00000000-0000-0000-0000-000000000031',
     '00000000-0000-0000-0000-000000000003',
     'Residenz Seeblick',
     'Seefeldstrasse 123, 8008 Zürich',
     NOW() - INTERVAL '1 year'),
    ('00000000-0000-0000-0000-000000000032',
     '00000000-0000-0000-0000-000000000003',
     'Residenz Parkblick',
     'Seefeldstrasse 125, 8008 Zürich',
     NOW() - INTERVAL '1 year'),
    ('00000000-0000-0000-0000-000000000033',
     '00000000-0000-0000-0000-000000000003',
     'Residenz Bergblick',
     'Seefeldstrasse 127, 8008 Zürich',
     NOW() - INTERVAL '1 year');

  -- Oerlikon (4 buildings)
  INSERT INTO buildings (id, property_id, name, address, created_at) VALUES
    ('00000000-0000-0000-0000-000000000041',
     '00000000-0000-0000-0000-000000000004',
     'Turm Nord',
     'Affolternstrasse 56A, 8050 Zürich',
     NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-000000000042',
     '00000000-0000-0000-0000-000000000004',
     'Turm Süd',
     'Affolternstrasse 56B, 8050 Zürich',
     NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-000000000043',
     '00000000-0000-0000-0000-000000000004',
     'Flachbau West',
     'Affolternstrasse 56C, 8050 Zürich',
     NOW() - INTERVAL '6 months'),
    ('00000000-0000-0000-0000-000000000044',
     '00000000-0000-0000-0000-000000000004',
     'Flachbau Ost',
     'Affolternstrasse 56D, 8050 Zürich',
     NOW() - INTERVAL '6 months');

  -- Wabern (4 row houses)
  INSERT INTO buildings (id, property_id, name, address, created_at) VALUES
    ('00000000-0000-0000-0000-000000000051',
     '00000000-0000-0000-0000-000000000005',
     'Reihenhaus 1',
     'Seftigenstrasse 201, 3084 Wabern',
     NOW() - INTERVAL '3 months'),
    ('00000000-0000-0000-0000-000000000052',
     '00000000-0000-0000-0000-000000000005',
     'Reihenhaus 2',
     'Seftigenstrasse 203, 3084 Wabern',
     NOW() - INTERVAL '3 months'),
    ('00000000-0000-0000-0000-000000000053',
     '00000000-0000-0000-0000-000000000005',
     'Reihenhaus 3',
     'Seftigenstrasse 205, 3084 Wabern',
     NOW() - INTERVAL '3 months'),
    ('00000000-0000-0000-0000-000000000054',
     '00000000-0000-0000-0000-000000000005',
     'Reihenhaus 4',
     'Seftigenstrasse 207, 3084 Wabern',
     NOW() - INTERVAL '3 months');

  -- =====================================================
  -- UNITS (Sample units for projects)
  -- =====================================================

  -- Limmatstrasse Haus A - 4 apartments
  INSERT INTO units (id, building_id, name, unit_type, floor, position, tenant_name, rent_amount) VALUES
    ('00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000000011',
     '1.OG Links', 'apartment', 1, 'left', 'Familie Brunner', 1850.00),
    ('00000000-0000-0000-0000-000000000102',
     '00000000-0000-0000-0000-000000000011',
     '1.OG Rechts', 'apartment', 1, 'right', 'Hr. Meier', 1750.00),
    ('00000000-0000-0000-0000-000000000103',
     '00000000-0000-0000-0000-000000000011',
     '2.OG Links', 'apartment', 2, 'left', 'Fr. Keller', 1900.00),
    ('00000000-0000-0000-0000-000000000104',
     '00000000-0000-0000-0000-000000000011',
     '2.OG Rechts', 'apartment', 2, 'right', NULL, 1850.00);  -- Vacant

  -- Seefeld Residenz Seeblick - 3 apartments
  INSERT INTO units (id, building_id, name, unit_type, floor, position, tenant_name, rent_amount) VALUES
    ('00000000-0000-0000-0000-000000000111',
     '00000000-0000-0000-0000-000000000031',
     'Attika West', 'apartment', 5, 'west', 'Dr. Weber', 4200.00),
    ('00000000-0000-0000-0000-000000000112',
     '00000000-0000-0000-0000-000000000031',
     'Attika Ost', 'apartment', 5, 'east', 'Familie Huber', 4500.00),
    ('00000000-0000-0000-0000-000000000113',
     '00000000-0000-0000-0000-000000000031',
     '3.OG Mitte', 'apartment', 3, 'middle', NULL, 3200.00);  -- Vacant

  -- Oerlikon Turm Nord - 3 apartments
  INSERT INTO units (id, building_id, name, unit_type, floor, position, tenant_name, rent_amount) VALUES
    ('00000000-0000-0000-0000-000000000121',
     '00000000-0000-0000-0000-000000000041',
     'EG Links', 'apartment', 0, 'left', 'Hr. Schmid', 1650.00),
    ('00000000-0000-0000-0000-000000000122',
     '00000000-0000-0000-0000-000000000041',
     'EG Rechts', 'apartment', 0, 'right', 'Familie Müller', 1700.00),
    ('00000000-0000-0000-0000-000000000123',
     '00000000-0000-0000-0000-000000000041',
     '1.OG Links', 'apartment', 1, 'left', 'Fr. Fischer', 1750.00);

  -- =====================================================
  -- PARTNERS (20+ Handwerker und Lieferanten)
  -- =====================================================

  -- Contractors (Handwerker) - 15 partners
  INSERT INTO partners (id, partner_type, company_name, contact_name, email, phone, address, trade_categories, is_active, notes) VALUES
    ('00000000-0000-0000-0000-000000010001',
     'contractor', 'Müller Sanitär AG', 'Hans Müller', 'info@mueller-sanitaer.ch', '+41 44 123 45 67',
     'Badenerstrasse 100, 8004 Zürich', ARRAY['plumbing']::trade_category[], true,
     'Zuverlässiger Partner seit 2018'),
    ('00000000-0000-0000-0000-000000010002',
     'contractor', 'Brunner Elektro GmbH', 'Peter Brunner', 'kontakt@brunner-elektro.ch', '+41 44 234 56 78',
     'Industriestrasse 25, 8005 Zürich', ARRAY['electrical']::trade_category[], true,
     'Notfalldienst 24/7 verfügbar'),
    ('00000000-0000-0000-0000-000000010003',
     'contractor', 'Fischer Malerei', 'Thomas Fischer', 'info@fischer-malerei.ch', '+41 44 345 67 89',
     'Langstrasse 150, 8004 Zürich', ARRAY['painting']::trade_category[], true, NULL),
    ('00000000-0000-0000-0000-000000010004',
     'contractor', 'Weber Bodenbeläge AG', 'Martin Weber', 'anfrage@weber-boden.ch', '+41 44 456 78 90',
     'Hohlstrasse 80, 8004 Zürich', ARRAY['flooring']::trade_category[], true,
     'Spezialist für Parkett und Laminat'),
    ('00000000-0000-0000-0000-000000010005',
     'contractor', 'Schmid Schreiner GmbH', 'Beat Schmid', 'info@schmid-schreiner.ch', '+41 44 567 89 01',
     'Albisriederstrasse 200, 8047 Zürich', ARRAY['carpentry']::trade_category[], true,
     'Küchen- und Möbelbau'),
    ('00000000-0000-0000-0000-000000010006',
     'contractor', 'Keller Gipser AG', 'Urs Keller', 'kontakt@keller-gipser.ch', '+41 44 678 90 12',
     'Josefstrasse 90, 8005 Zürich', ARRAY['masonry']::trade_category[], true, NULL),
    ('00000000-0000-0000-0000-000000010007',
     'contractor', 'Huber Heizung & Klima', 'Werner Huber', 'service@huber-hk.ch', '+41 44 789 01 23',
     'Sihlquai 50, 8005 Zürich', ARRAY['hvac', 'plumbing']::trade_category[], true,
     'Wärmepumpen-Spezialist'),
    ('00000000-0000-0000-0000-000000010008',
     'contractor', 'Gerber Dach & Fassade', 'Reto Gerber', 'info@gerber-dach.ch', '+41 44 890 12 34',
     'Birmensdorferstrasse 300, 8055 Zürich', ARRAY['roofing']::trade_category[], true, NULL),
    ('00000000-0000-0000-0000-000000010009',
     'contractor', 'Steiner Fenster AG', 'Daniel Steiner', 'verkauf@steiner-fenster.ch', '+41 44 901 23 45',
     'Hardturmstrasse 120, 8005 Zürich', ARRAY['glazing', 'carpentry']::trade_category[], true,
     'Fenster und Türen'),
    ('00000000-0000-0000-0000-000000010010',
     'contractor', 'Baumann Garten & Umgebung', 'Simon Baumann', 'info@baumann-garten.ch', '+41 44 012 34 56',
     'Schaffhauserstrasse 400, 8050 Zürich', ARRAY['landscaping']::trade_category[], true, NULL),
    ('00000000-0000-0000-0000-000000010011',
     'contractor', 'Berner Sanitär GmbH', 'Christian Berner', 'kontakt@berner-san.ch', '+41 31 123 45 67',
     'Effingerstrasse 50, 3008 Bern', ARRAY['plumbing']::trade_category[], true,
     'Berner Raum'),
    ('00000000-0000-0000-0000-000000010012',
     'contractor', 'Hofer Elektrik', 'Markus Hofer', 'info@hofer-elektrik.ch', '+41 31 234 56 78',
     'Monbijoustrasse 100, 3007 Bern', ARRAY['electrical']::trade_category[], true,
     'Berner Raum'),
    ('00000000-0000-0000-0000-000000010013',
     'contractor', 'Zimmermann Allrounder', 'Paul Zimmermann', 'paul@zimmermann-bau.ch', '+41 44 111 22 33',
     'Seestrasse 500, 8038 Zürich', ARRAY['general', 'demolition']::trade_category[], true,
     'Kleinere Arbeiten aller Art'),
    ('00000000-0000-0000-0000-000000010014',
     'contractor', 'Reinigung Blitz GmbH', 'Susanne Blitz', 'service@blitz-reinigung.ch', '+41 44 222 33 44',
     'Rämistrasse 60, 8001 Zürich', ARRAY['cleaning']::trade_category[], true,
     'Baureinigung und Endreinigung'),
    ('00000000-0000-0000-0000-000000010015',
     'contractor', 'Abriss & Entsorgung AG', 'Rolf Hammer', 'info@abriss-ag.ch', '+41 44 333 44 55',
     'Industriestrasse 80, 8304 Wallisellen', ARRAY['demolition']::trade_category[], false,
     'INAKTIV - Geschäftsaufgabe 2025');

  -- Suppliers (Lieferanten) - 7 partners
  INSERT INTO partners (id, partner_type, company_name, contact_name, email, phone, address, trade_categories, is_active, notes) VALUES
    ('00000000-0000-0000-0000-000000010016',
     'supplier', 'Bauhaus Schweiz', 'Kundenservice', 'kontakt@bauhaus.ch', '+41 44 999 88 77',
     'Letzigraben 89, 8003 Zürich', ARRAY[]::trade_category[], true,
     'Baumarkt für Kleinmaterial'),
    ('00000000-0000-0000-0000-000000010017',
     'supplier', 'Sanitas Troesch AG', 'Roger Troesch', 'info@sanitastroesch.ch', '+41 44 888 77 66',
     'Pfingstweidstrasse 60, 8005 Zürich', ARRAY[]::trade_category[], true,
     'Badezimmerausstattung'),
    ('00000000-0000-0000-0000-000000010018',
     'supplier', 'Elektro Material AG', 'Verkauf', 'bestellung@em-ag.ch', '+41 44 777 66 55',
     'Hardstrasse 201, 8005 Zürich', ARRAY[]::trade_category[], true,
     'Elektromaterial Grosshandel'),
    ('00000000-0000-0000-0000-000000010019',
     'supplier', 'Farben Frey AG', 'Andrea Frey', 'verkauf@farbenfrey.ch', '+41 44 666 55 44',
     'Dufourstrasse 100, 8008 Zürich', ARRAY[]::trade_category[], true,
     'Farben und Lacke'),
    ('00000000-0000-0000-0000-000000010020',
     'supplier', 'Bodenland GmbH', 'Samuel Land', 'info@bodenland.ch', '+41 44 555 44 33',
     'Talacker 50, 8001 Zürich', ARRAY[]::trade_category[], true,
     'Parkett, Laminat, Teppich'),
    ('00000000-0000-0000-0000-000000010021',
     'supplier', 'Küchen Schmidt', 'Maria Schmidt', 'kuchen@schmidt.ch', '+41 44 444 33 22',
     'Bahnhofstrasse 90, 8001 Zürich', ARRAY[]::trade_category[], true,
     'Einbauküchen und Geräte'),
    ('00000000-0000-0000-0000-000000010022',
     'supplier', 'Altmetall Recycling AG', 'Otto Alt', NULL, '+41 44 333 22 11',
     'Industrieweg 10, 8304 Wallisellen', ARRAY[]::trade_category[], false,
     'INAKTIV - Neuer Lieferant gesucht');

  -- =====================================================
  -- TEMPLATES (5 Vorlagen)
  -- =====================================================

  INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active, total_duration_days, total_estimated_cost) VALUES
    ('00000000-0000-0000-0000-000000020001',
     'Vollrenovation 3.5 Zimmer',
     'Komplette Renovation einer 3.5-Zimmer-Wohnung inkl. Bad und Küche',
     'complete_renovation', 'unit', NULL, true, 45, 75000.00),
    ('00000000-0000-0000-0000-000000020002',
     'Bad-Sanierung',
     'Komplettsanierung Badezimmer mit Dusche/Wanne',
     'room_specific', 'room', 'bathroom', true, 10, 18000.00),
    ('00000000-0000-0000-0000-000000020003',
     'Küchen-Einbau',
     'Neue Einbauküche mit Geräten',
     'room_specific', 'room', 'kitchen', true, 8, 22000.00),
    ('00000000-0000-0000-0000-000000020004',
     'Malerarbeiten',
     'Wände und Decken streichen für gesamte Wohnung',
     'trade_specific', 'unit', NULL, true, 5, 4500.00),
    ('00000000-0000-0000-0000-000000020005',
     'Bodenbelag-Erneuerung',
     'Neuer Parkettboden in allen Räumen',
     'trade_specific', 'unit', NULL, true, 7, 12000.00);

  -- =====================================================
  -- RENOVATION PROJECTS (12 Projekte mit verschiedenen Status)
  -- =====================================================

  -- Active healthy projects (3) - deadline in future, recent updates
  INSERT INTO renovation_projects (id, unit_id, template_id, name, description, status,
    planned_start_date, planned_end_date, estimated_cost, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000030001',
     '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000020001',
     'Vollrenovation Brunner',
     'Komplettrenovation nach Mieterwechsel',
     'active',
     NOW()::date - 10,
     NOW()::date + 35,
     75000.00,
     NOW() - INTERVAL '15 days',
     NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000030002',
     '00000000-0000-0000-0000-000000000111',
     '00000000-0000-0000-0000-000000020002',
     'Bad-Sanierung Weber',
     'Modernisierung Hauptbad mit bodenebener Dusche',
     'active',
     NOW()::date - 5,
     NOW()::date + 15,
     22000.00,
     NOW() - INTERVAL '8 days',
     NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000030003',
     '00000000-0000-0000-0000-000000000121',
     '00000000-0000-0000-0000-000000020003',
     'Küchen-Einbau Schmid',
     'Neue Küche nach Wasserschaden',
     'active',
     NOW()::date - 3,
     NOW()::date + 25,
     24500.00,
     NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '1 day');

  -- Overdue projects (2) - deadline passed, still active
  INSERT INTO renovation_projects (id, unit_id, template_id, name, description, status,
    planned_start_date, planned_end_date, estimated_cost, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000030004',
     '00000000-0000-0000-0000-000000000102',
     '00000000-0000-0000-0000-000000020004',
     'Malerarbeiten Meier',
     'Wände streichen nach Auszug - VERZÖGERT durch Lieferengpass',
     'active',
     NOW()::date - 20,
     NOW()::date - 5,  -- Deadline passed
     5200.00,
     NOW() - INTERVAL '25 days',
     NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000030005',
     '00000000-0000-0000-0000-000000000112',
     '00000000-0000-0000-0000-000000020005',
     'Parkettboden Huber',
     'Ersatz beschädigter Bodenbeläge - VERZÖGERT durch Handwerkermangel',
     'active',
     NOW()::date - 30,
     NOW()::date - 8,  -- Deadline passed
     14000.00,
     NOW() - INTERVAL '35 days',
     NOW() - INTERVAL '2 days');

  -- Stalled projects (2) - no updates for 10+ days
  INSERT INTO renovation_projects (id, unit_id, template_id, name, description, status,
    planned_start_date, planned_end_date, estimated_cost, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000030006',
     '00000000-0000-0000-0000-000000000103',
     '00000000-0000-0000-0000-000000020002',
     'Bad-Sanierung Keller',
     'Badezimmer-Renovation - WARTEND auf Materiallieferung',
     'active',
     NOW()::date - 25,
     NOW()::date + 10,
     19500.00,
     NOW() - INTERVAL '30 days',
     NOW() - INTERVAL '12 days'),  -- Stalled: no update for 12 days
    ('00000000-0000-0000-0000-000000030007',
     '00000000-0000-0000-0000-000000000122',
     NULL,
     'Fensterersatz Müller',
     'Austausch aller Fenster - WARTEND auf Baubewilligung',
     'planned',
     NOW()::date + 20,
     NOW()::date + 40,
     35000.00,
     NOW() - INTERVAL '45 days',
     NOW() - INTERVAL '15 days');  -- Stalled: no update for 15 days

  -- Completed projects (3) - for history/timeline
  INSERT INTO renovation_projects (id, unit_id, template_id, name, description, status,
    planned_start_date, planned_end_date, actual_start_date, actual_end_date,
    estimated_cost, actual_cost, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000030008',
     '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000020002',
     'Bad-Sanierung 2024',
     'Badezimmer komplett erneuert - termingerecht abgeschlossen',
     'finished',
     NOW()::date - 120,
     NOW()::date - 100,
     NOW()::date - 118,
     NOW()::date - 98,
     18000.00,
     17500.00,
     NOW() - INTERVAL '130 days',
     NOW() - INTERVAL '98 days'),
    ('00000000-0000-0000-0000-000000030009',
     '00000000-0000-0000-0000-000000000111',
     '00000000-0000-0000-0000-000000020004',
     'Malerarbeiten Seefeld',
     'Komplette Neubemalung - leicht verspätet',
     'approved',
     NOW()::date - 90,
     NOW()::date - 80,
     NOW()::date - 88,
     NOW()::date - 75,
     4800.00,
     5100.00,
     NOW() - INTERVAL '100 days',
     NOW() - INTERVAL '74 days'),
    ('00000000-0000-0000-0000-000000030010',
     '00000000-0000-0000-0000-000000000123',
     '00000000-0000-0000-0000-000000020005',
     'Bodenbelag Fischer',
     'Neuer Parkettboden - unter Budget abgeschlossen',
     'approved',
     NOW()::date - 60,
     NOW()::date - 45,
     NOW()::date - 58,
     NOW()::date - 44,
     12000.00,
     11200.00,
     NOW() - INTERVAL '70 days',
     NOW() - INTERVAL '43 days');

  -- Blocked project (1)
  INSERT INTO renovation_projects (id, unit_id, template_id, name, description, status,
    planned_start_date, planned_end_date, estimated_cost, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000030011',
     '00000000-0000-0000-0000-000000000104',
     '00000000-0000-0000-0000-000000020001',
     'Vollrenovation Leerstand',
     'Komplettrenovation - BLOCKIERT durch Asbestfund',
     'blocked',
     NOW()::date - 15,
     NOW()::date + 30,
     82000.00,
     NOW() - INTERVAL '20 days',
     NOW() - INTERVAL '5 days');

  -- Planned project (1) - future
  INSERT INTO renovation_projects (id, unit_id, template_id, name, description, status,
    planned_start_date, planned_end_date, estimated_cost, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000030012',
     '00000000-0000-0000-0000-000000000113',
     '00000000-0000-0000-0000-000000020001',
     'Vollrenovation Seefeld 3.OG',
     'Geplant für Q2 2026 nach Mieterwechsel',
     'planned',
     NOW()::date + 60,
     NOW()::date + 105,
     78000.00,
     NOW() - INTERVAL '10 days',
     NOW() - INTERVAL '3 days');

  -- =====================================================
  -- SUMMARY NOTICE
  -- =====================================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'KEWA Demo Data Created Successfully:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Properties: 5';
  RAISE NOTICE '  Buildings: 16';
  RAISE NOTICE '  Units: 10 (sample for projects)';
  RAISE NOTICE '  Partners: 22 (15 contractors, 7 suppliers)';
  RAISE NOTICE '  Templates: 5';
  RAISE NOTICE '  Projects: 12';
  RAISE NOTICE '    - Active: 3';
  RAISE NOTICE '    - Overdue: 2';
  RAISE NOTICE '    - Stalled: 2';
  RAISE NOTICE '    - Completed: 3';
  RAISE NOTICE '    - Blocked: 1';
  RAISE NOTICE '    - Planned: 1';
  RAISE NOTICE '========================================';

END $$;
