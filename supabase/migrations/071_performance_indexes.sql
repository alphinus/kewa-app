-- KEWA Renovations Operations System
-- Migration: 071_performance_indexes.sql
-- Phase: 32-01 Database Optimization
-- Requirement: PERF-03 - p95 query latency < 100ms

-- =============================================
-- COMPOSITE INDEXES FOR VIEW/QUERY PERFORMANCE
-- =============================================
-- Based on query profiling analysis in:
-- .planning/baselines/v3.1-phase32-query-profile.md

-- ---------------------------------------------
-- 1. Unit Condition Summary View Optimization
-- ---------------------------------------------
-- Query: SELECT ... FROM units u LEFT JOIN rooms r ON r.unit_id = u.id GROUP BY ...
-- Pattern: JOIN on unit_id with aggregation by condition
-- Existing: idx_rooms_unit_id (unit_id), idx_rooms_condition (condition) - separate
-- Benefit: Single composite index covers JOIN and CASE WHEN aggregations

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rooms_unit_condition
ON rooms(unit_id, condition);

-- ---------------------------------------------
-- 2. Heatmap Units Filter Optimization
-- ---------------------------------------------
-- Query: SELECT ... FROM units WHERE building_id = $1 AND unit_type = 'apartment'
-- Pattern: Filter on building_id AND unit_type
-- Existing: idx_units_building_id (building_id) - single column
-- Benefit: Both WHERE conditions in single index scan

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_building_type
ON units(building_id, unit_type);

-- ---------------------------------------------
-- 3. Dashboard Projects Query Optimization
-- ---------------------------------------------
-- Query: SELECT ... FROM renovation_projects WHERE unit_id IN (...) AND status IN (...)
-- Pattern: Filter on unit_id array AND status array
-- Existing: idx_renovation_projects_unit_id, idx_renovation_projects_status - separate
-- Benefit: Composite index handles both IN conditions

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_renovation_projects_unit_status
ON renovation_projects(unit_id, status);

-- =============================================
-- UPDATE TABLE STATISTICS
-- =============================================
-- Ensures query planner uses new indexes appropriately

ANALYZE rooms;
ANALYZE units;
ANALYZE renovation_projects;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON INDEX idx_rooms_unit_condition IS 'PERF-03: Composite for unit_condition_summary view aggregation';
COMMENT ON INDEX idx_units_building_type IS 'PERF-03: Composite for heatmap building+type filter';
COMMENT ON INDEX idx_renovation_projects_unit_status IS 'PERF-03: Composite for dashboard unit+status queries';
