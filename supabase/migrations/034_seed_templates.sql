-- KEWA Renovations Operations System
-- Migration: 034_seed_templates.sql
-- Seed data: 3 starter templates (Komplett, Bad, Kueche)
-- Fulfills TMPL-01 (Complete renovation templates) and TMPL-02 (Room-specific templates)

-- Note: This migration requires 032_templates.sql and 033_template_triggers.sql
-- to be applied first. Those migrations create the template tables.

-- =============================================
-- TEMPLATE 1: KOMPLETT-RENOVATION
-- =============================================

INSERT INTO templates (id, name, description, category, scope, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000001',
  'Komplett-Renovation (Standard)',
  'Vollstaendige Wohnungsrenovation mit allen Gewerken: Demontage, Rohbau, Installationen, Ausbau',
  'complete_renovation',
  'unit',
  true
);

-- Phase 1: Vorbereitung & Demontage
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000001',
  '00000000-0000-0000-0008-000000000001',
  'Vorbereitung & Demontage',
  'Baustelleneinrichtung und Rueckbauarbeiten',
  '1',
  0
);

-- Package 1.1: Baustelleneinrichtung
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-110000000001',
  '00000000-0000-0000-0008-100000000001',
  'Baustelleneinrichtung',
  '1.1',
  0,
  'general'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-111000000001', '00000000-0000-0000-0008-110000000001', 'Schutzfolien und Abdeckungen anbringen', '1.1.1', 0, 1, 'general'),
  ('00000000-0000-0000-0008-111000000002', '00000000-0000-0000-0008-110000000001', 'Container bestellen und aufstellen', '1.1.2', 1, 1, 'general'),
  ('00000000-0000-0000-0008-111000000003', '00000000-0000-0000-0008-110000000001', 'Baustrom und Bauwasser einrichten', '1.1.3', 2, 1, 'electrical');

-- Package 1.2: Demontage
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-110000000002',
  '00000000-0000-0000-0008-100000000001',
  'Demontage',
  '1.2',
  1,
  'demolition'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-112000000001', '00000000-0000-0000-0008-110000000002', 'Sanitaerobjekte demontieren', '1.2.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-112000000002', '00000000-0000-0000-0008-110000000002', 'Kuechengeraete und -moebel entfernen', '1.2.2', 1, 1, 'general'),
  ('00000000-0000-0000-0008-112000000003', '00000000-0000-0000-0008-110000000002', 'Alte Bodenbelaege entfernen', '1.2.3', 2, 2, 'demolition'),
  ('00000000-0000-0000-0008-112000000004', '00000000-0000-0000-0008-110000000002', 'Wandbelaege entfernen (Fliesen, Tapeten)', '1.2.4', 3, 2, 'demolition');

-- Phase 2: Rohbauarbeiten
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000002',
  '00000000-0000-0000-0008-000000000001',
  'Rohbauarbeiten',
  'Vorbereitende Bauarbeiten und Untergrund',
  '2',
  1
);

-- Package 2.1: Untergrund
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-120000000001',
  '00000000-0000-0000-0008-100000000002',
  'Untergrundvorbereitung',
  '2.1',
  0,
  'masonry'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-121000000001', '00000000-0000-0000-0008-120000000001', 'Untergrund pruefen und ausbessern', '2.1.1', 0, 1, 'masonry'),
  ('00000000-0000-0000-0008-121000000002', '00000000-0000-0000-0008-120000000001', 'Ausgleichsmasse auftragen', '2.1.2', 1, 1, 'flooring');

-- Phase 3: Installationen
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000003',
  '00000000-0000-0000-0008-000000000001',
  'Installationen',
  'Elektro, Sanitaer, Heizung',
  '3',
  2
);

-- Package 3.1: Elektroinstallation
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-130000000001',
  '00000000-0000-0000-0008-100000000003',
  'Elektroinstallation',
  '3.1',
  0,
  'electrical'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-131000000001', '00000000-0000-0000-0008-130000000001', 'Leitungen verlegen', '3.1.1', 0, 2, 'electrical'),
  ('00000000-0000-0000-0008-131000000002', '00000000-0000-0000-0008-130000000001', 'Dosen setzen', '3.1.2', 1, 1, 'electrical'),
  ('00000000-0000-0000-0008-131000000003', '00000000-0000-0000-0008-130000000001', 'Schalter und Steckdosen montieren', '3.1.3', 2, 1, 'electrical');

-- Package 3.2: Sanitaerinstallation
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-130000000002',
  '00000000-0000-0000-0008-100000000003',
  'Sanitaerinstallation',
  '3.2',
  1,
  'plumbing'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-132000000001', '00000000-0000-0000-0008-130000000002', 'Wasserleitungen verlegen', '3.2.1', 0, 2, 'plumbing'),
  ('00000000-0000-0000-0008-132000000002', '00000000-0000-0000-0008-130000000002', 'Abwasserleitungen verlegen', '3.2.2', 1, 1, 'plumbing');

-- Phase 4: Ausbau & Finish
INSERT INTO template_phases (id, template_id, name, description, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-100000000004',
  '00000000-0000-0000-0008-000000000001',
  'Ausbau & Finish',
  'Oberflaechen, Montage, Reinigung',
  '4',
  3
);

-- Package 4.1: Oberflaechenarbeiten
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-140000000001',
  '00000000-0000-0000-0008-100000000004',
  'Oberflaechenarbeiten',
  '4.1',
  0,
  'painting'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-141000000001', '00000000-0000-0000-0008-140000000001', 'Waende spachteln und schleifen', '4.1.1', 0, 2, 'painting'),
  ('00000000-0000-0000-0008-141000000002', '00000000-0000-0000-0008-140000000001', 'Grundierung auftragen', '4.1.2', 1, 1, 'painting'),
  ('00000000-0000-0000-0008-141000000003', '00000000-0000-0000-0008-140000000001', 'Decken und Waende streichen', '4.1.3', 2, 3, 'painting');

-- Package 4.2: Bodenarbeiten
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-140000000002',
  '00000000-0000-0000-0008-100000000004',
  'Bodenarbeiten',
  '4.2',
  1,
  'flooring'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-142000000001', '00000000-0000-0000-0008-140000000002', 'Bodenbelag verlegen', '4.2.1', 0, 3, 'flooring'),
  ('00000000-0000-0000-0008-142000000002', '00000000-0000-0000-0008-140000000002', 'Sockelleisten montieren', '4.2.2', 1, 1, 'flooring');

-- Package 4.3: Endmontage
INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-140000000003',
  '00000000-0000-0000-0008-100000000004',
  'Endmontage',
  '4.3',
  2,
  'general'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-143000000001', '00000000-0000-0000-0008-140000000003', 'Sanitaerobjekte montieren', '4.3.1', 0, 2, 'plumbing'),
  ('00000000-0000-0000-0008-143000000002', '00000000-0000-0000-0008-140000000003', 'Kueche montieren', '4.3.2', 1, 2, 'carpentry'),
  ('00000000-0000-0000-0008-143000000003', '00000000-0000-0000-0008-140000000003', 'Lampen und Armaturen montieren', '4.3.3', 2, 1, 'electrical'),
  ('00000000-0000-0000-0008-143000000004', '00000000-0000-0000-0008-140000000003', 'Endreinigung', '4.3.4', 3, 1, 'cleaning');

-- Quality Gates for Komplett-Renovation
INSERT INTO template_quality_gates (id, template_id, gate_level, phase_id, name, min_photos_required)
VALUES
  ('00000000-0000-0000-0008-900000000001', '00000000-0000-0000-0008-000000000001', 'phase', '00000000-0000-0000-0008-100000000001', 'Demontage abgeschlossen', 2),
  ('00000000-0000-0000-0008-900000000002', '00000000-0000-0000-0008-000000000001', 'phase', '00000000-0000-0000-0008-100000000003', 'Installationen geprueft', 3),
  ('00000000-0000-0000-0008-900000000003', '00000000-0000-0000-0008-000000000001', 'phase', '00000000-0000-0000-0008-100000000004', 'Endabnahme', 5);

-- =============================================
-- TEMPLATE 2: BADEZIMMER-RENOVATION
-- =============================================

INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000002',
  'Badezimmer-Renovation',
  'Komplette Badezimmer-Erneuerung inkl. Sanitaer, Fliesen, Elektro',
  'room_specific',
  'room',
  'bathroom',
  true
);

-- Phase 1: Demontage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000001',
  '00000000-0000-0000-0008-000000000002',
  'Demontage',
  '1',
  0
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-210000000001',
  '00000000-0000-0000-0008-200000000001',
  'Rueckbau Bad',
  '1.1',
  0,
  'demolition'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-211000000001', '00000000-0000-0000-0008-210000000001', 'Sanitaerobjekte demontieren (WC, Lavabo, Dusche/Wanne)', '1.1.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-211000000002', '00000000-0000-0000-0008-210000000001', 'Alte Fliesen entfernen', '1.1.2', 1, 2, 'demolition'),
  ('00000000-0000-0000-0008-211000000003', '00000000-0000-0000-0008-210000000001', 'Alten Bodenbelag entfernen', '1.1.3', 2, 1, 'demolition');

-- Phase 2: Installationen
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000002',
  '00000000-0000-0000-0008-000000000002',
  'Installationen',
  '2',
  1
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-220000000001',
  '00000000-0000-0000-0008-200000000002',
  'Sanitaer',
  '2.1',
  0,
  'plumbing'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-221000000001', '00000000-0000-0000-0008-220000000001', 'Wasserleitungen verlegen', '2.1.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-221000000002', '00000000-0000-0000-0008-220000000001', 'Abwasserleitungen verlegen', '2.1.2', 1, 1, 'plumbing');

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-220000000002',
  '00000000-0000-0000-0008-200000000002',
  'Elektro',
  '2.2',
  1,
  'electrical'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-222000000001', '00000000-0000-0000-0008-220000000002', 'Elektroleitungen verlegen', '2.2.1', 0, 1, 'electrical');

-- Phase 3: Oberflaechen
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000003',
  '00000000-0000-0000-0008-000000000002',
  'Oberflaechen',
  '3',
  2
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-230000000001',
  '00000000-0000-0000-0008-200000000003',
  'Fliesen',
  '3.1',
  0,
  'flooring'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-231000000001', '00000000-0000-0000-0008-230000000001', 'Abdichtung auftragen', '3.1.1', 0, 1, 'flooring'),
  ('00000000-0000-0000-0008-231000000002', '00000000-0000-0000-0008-230000000001', 'Bodenfliesen verlegen', '3.1.2', 1, 2, 'flooring'),
  ('00000000-0000-0000-0008-231000000003', '00000000-0000-0000-0008-230000000001', 'Wandfliesen verlegen', '3.1.3', 2, 2, 'flooring'),
  ('00000000-0000-0000-0008-231000000004', '00000000-0000-0000-0008-230000000001', 'Fugen verfuellen', '3.1.4', 3, 1, 'flooring');

-- Phase 4: Montage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-200000000004',
  '00000000-0000-0000-0008-000000000002',
  'Montage',
  '4',
  3
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-240000000001',
  '00000000-0000-0000-0008-200000000004',
  'Endmontage',
  '4.1',
  0,
  'plumbing'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-241000000001', '00000000-0000-0000-0008-240000000001', 'WC montieren', '4.1.1', 0, 1, 'plumbing'),
  ('00000000-0000-0000-0008-241000000002', '00000000-0000-0000-0008-240000000001', 'Lavabo montieren', '4.1.2', 1, 1, 'plumbing'),
  ('00000000-0000-0000-0008-241000000003', '00000000-0000-0000-0008-240000000001', 'Dusche/Wanne montieren', '4.1.3', 2, 1, 'plumbing'),
  ('00000000-0000-0000-0008-241000000004', '00000000-0000-0000-0008-240000000001', 'Spiegel und Accessoires montieren', '4.1.4', 3, 1, 'general'),
  ('00000000-0000-0000-0008-241000000005', '00000000-0000-0000-0008-240000000001', 'Endreinigung', '4.1.5', 4, 1, 'cleaning');

-- Quality Gate for Bad
INSERT INTO template_quality_gates (id, template_id, gate_level, phase_id, name, min_photos_required, checklist_items)
VALUES (
  '00000000-0000-0000-0008-900000000010',
  '00000000-0000-0000-0008-000000000002',
  'phase',
  '00000000-0000-0000-0008-200000000004',
  'Badezimmer Endabnahme',
  4,
  '[{"id": "chk1", "text": "Alle Sanitaerobjekte funktionsfaehig", "required": true}, {"id": "chk2", "text": "Keine Leckagen", "required": true}, {"id": "chk3", "text": "Fliesen ohne Maengel", "required": true}]'::JSONB
);

-- =============================================
-- TEMPLATE 3: KUECHEN-RENOVATION
-- =============================================

INSERT INTO templates (id, name, description, category, scope, target_room_type, is_active)
VALUES (
  '00000000-0000-0000-0008-000000000003',
  'Kuechen-Renovation',
  'Komplette Kuechen-Erneuerung inkl. Elektro, Sanitaer, Moebel',
  'room_specific',
  'room',
  'kitchen',
  true
);

-- Phase 1: Demontage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-300000000001',
  '00000000-0000-0000-0008-000000000003',
  'Demontage',
  '1',
  0
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-310000000001',
  '00000000-0000-0000-0008-300000000001',
  'Rueckbau Kueche',
  '1.1',
  0,
  'demolition'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-311000000001', '00000000-0000-0000-0008-310000000001', 'Elektrogeraete abklemmen und entfernen', '1.1.1', 0, 1, 'electrical'),
  ('00000000-0000-0000-0008-311000000002', '00000000-0000-0000-0008-310000000001', 'Kuechenmoebel demontieren', '1.1.2', 1, 1, 'carpentry'),
  ('00000000-0000-0000-0008-311000000003', '00000000-0000-0000-0008-310000000001', 'Alte Arbeitsplatte entfernen', '1.1.3', 2, 1, 'demolition');

-- Phase 2: Vorbereitung
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-300000000002',
  '00000000-0000-0000-0008-000000000003',
  'Vorbereitung',
  '2',
  1
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-320000000001',
  '00000000-0000-0000-0008-300000000002',
  'Installationen',
  '2.1',
  0,
  'electrical'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-321000000001', '00000000-0000-0000-0008-320000000001', 'Elektroinstallation anpassen', '2.1.1', 0, 1, 'electrical'),
  ('00000000-0000-0000-0008-321000000002', '00000000-0000-0000-0008-320000000001', 'Wasseranschluesse anpassen', '2.1.2', 1, 1, 'plumbing');

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-320000000002',
  '00000000-0000-0000-0008-300000000002',
  'Oberflaechen',
  '2.2',
  1,
  'painting'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-322000000001', '00000000-0000-0000-0008-320000000002', 'Waende ausbessern und streichen', '2.2.1', 0, 2, 'painting'),
  ('00000000-0000-0000-0008-322000000002', '00000000-0000-0000-0008-320000000002', 'Boden vorbereiten', '2.2.2', 1, 1, 'flooring');

-- Phase 3: Montage
INSERT INTO template_phases (id, template_id, name, wbs_code, sort_order)
VALUES (
  '00000000-0000-0000-0008-300000000003',
  '00000000-0000-0000-0008-000000000003',
  'Montage',
  '3',
  2
);

INSERT INTO template_packages (id, phase_id, name, wbs_code, sort_order, trade_category)
VALUES (
  '00000000-0000-0000-0008-330000000001',
  '00000000-0000-0000-0008-300000000003',
  'Kuechenmontage',
  '3.1',
  0,
  'carpentry'
);

INSERT INTO template_tasks (id, package_id, name, wbs_code, sort_order, estimated_duration_days, trade_category)
VALUES
  ('00000000-0000-0000-0008-331000000001', '00000000-0000-0000-0008-330000000001', 'Unterschraenke montieren', '3.1.1', 0, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000002', '00000000-0000-0000-0008-330000000001', 'Oberschraenke montieren', '3.1.2', 1, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000003', '00000000-0000-0000-0008-330000000001', 'Arbeitsplatte montieren', '3.1.3', 2, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000004', '00000000-0000-0000-0008-330000000001', 'Spuele und Armatur montieren', '3.1.4', 3, 1, 'plumbing'),
  ('00000000-0000-0000-0008-331000000005', '00000000-0000-0000-0008-330000000001', 'Elektrogeraete einbauen und anschliessen', '3.1.5', 4, 1, 'electrical'),
  ('00000000-0000-0000-0008-331000000006', '00000000-0000-0000-0008-330000000001', 'Fronten und Griffe montieren', '3.1.6', 5, 1, 'carpentry'),
  ('00000000-0000-0000-0008-331000000007', '00000000-0000-0000-0008-330000000001', 'Endreinigung', '3.1.7', 6, 1, 'cleaning');

-- Quality Gate for Kueche
INSERT INTO template_quality_gates (id, template_id, gate_level, phase_id, name, min_photos_required, checklist_items)
VALUES (
  '00000000-0000-0000-0008-900000000020',
  '00000000-0000-0000-0008-000000000003',
  'phase',
  '00000000-0000-0000-0008-300000000003',
  'Kueche Endabnahme',
  4,
  '[{"id": "chk1", "text": "Alle Geraete funktionsfaehig", "required": true}, {"id": "chk2", "text": "Wasser- und Stromanschluss geprueft", "required": true}, {"id": "chk3", "text": "Fronten und Schubladen schliessen korrekt", "required": true}]'::JSONB
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE templates IS 'Seeded with 3 starter templates: Komplett-Renovation, Bad, Kueche';
