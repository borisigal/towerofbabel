-- Migration: Add usage_reported field to interpretations table
-- Date: 2025-10-29
-- Purpose: Prevent duplicate usage reporting to Lemon Squeezy (Critical Bug Fix)

-- Step 1: Add the column (already done via db push, but documented here)
-- ALTER TABLE interpretations ADD COLUMN IF NOT EXISTS usage_reported BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Mark all existing interpretations as reported
-- This prevents retroactive charging for interpretations created before this fix
UPDATE interpretations
SET usage_reported = true
WHERE usage_reported = false;

-- Step 3: Verify the update
-- SELECT
--   COUNT(*) as total_interpretations,
--   COUNT(*) FILTER (WHERE usage_reported = true) as marked_as_reported
-- FROM interpretations;

-- Expected result: All existing interpretations should have usage_reported = true
