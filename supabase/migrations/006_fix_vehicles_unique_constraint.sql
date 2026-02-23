-- Migration 006: Fix vehicles unique constraint for PostgREST upsert compatibility
--
-- Problem: The expression index idx_vehicles_unique uses COALESCE(engine, ''),
-- COALESCE(submodel, ''). PostgREST's ON CONFLICT clause can only reference
-- plain column UNIQUE constraints, not expression indexes.
--
-- Fix: Drop the expression index and add a proper UNIQUE constraint on the
-- 4 core columns (make, model, year_start, year_end). Engine and submodel
-- columns remain in the table for future use but are not part of the
-- uniqueness constraint.

-- Drop the expression-based unique index
DROP INDEX IF EXISTS idx_vehicles_unique;

-- Add a proper UNIQUE constraint on the 4 columns used by the import pipeline.
-- This creates a btree index that PostgREST can target with ON CONFLICT.
ALTER TABLE vehicles
  ADD CONSTRAINT uq_vehicles_make_model_years
  UNIQUE (make, model, year_start, year_end);
