-- AlterTable
-- Add optional feedback_text field to interpretations table
-- This field stores user-provided feedback text (max 500 chars enforced at API layer)
-- Nullable to maintain backward compatibility with existing feedback submissions
--
-- Rollback procedure:
-- To rollback this migration, run:
-- ALTER TABLE "interpretations" DROP COLUMN "feedback_text";

ALTER TABLE "interpretations" ADD COLUMN "feedback_text" TEXT;
