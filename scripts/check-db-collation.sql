-- Database Encoding and Collation Verification
-- Run via: psql $DATABASE_URL -f scripts/check-db-collation.sql

-- 1. Check database encoding and collation
SELECT
  current_database() AS database,
  pg_encoding_to_char(encoding) AS encoding,
  datcollate AS lc_collate,
  datctype AS lc_ctype
FROM pg_database
WHERE datname = current_database();

-- 2. Available German collations
SELECT collname, collprovider, collcollate, collctype
FROM pg_collation
WHERE collname ILIKE '%de_%' OR collname ILIKE '%german%'
ORDER BY collname;

-- 3. Test German sort order with current default collation
SELECT word FROM (
  VALUES ('Apfel'), ('Ärger'), ('Zucker'), ('Änderung'), ('Öffnung'), ('Übersicht')
) AS test(word)
ORDER BY word;

-- 4. Check text columns with non-default collation
SELECT
  table_name,
  column_name,
  collation_name
FROM information_schema.columns
WHERE collation_name IS NOT NULL
  AND table_schema = 'public'
ORDER BY table_name, column_name;
