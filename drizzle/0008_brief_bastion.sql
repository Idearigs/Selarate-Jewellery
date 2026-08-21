ALTER TABLE "settings" ALTER COLUMN "studio_name" SET DEFAULT 'Selarate';--> statement-breakpoint
-- Correct rows still holding the old default. Scoped to that exact value so a
-- name the studio typed for itself in the admin is never overwritten: the
-- column exists so the owner can override the constant without a deploy, and a
-- migration that ignored that would undo their edit on the next release.
UPDATE "settings" SET "studio_name" = 'Selarate' WHERE "studio_name" = 'Sélarté';
