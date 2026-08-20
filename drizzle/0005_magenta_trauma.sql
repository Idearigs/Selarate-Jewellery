ALTER TABLE "settings" ALTER COLUMN "studio_name" SET DEFAULT 'Artéstar Maison';--> statement-breakpoint
-- A changed DEFAULT only applies to new rows, and the settings row already
-- exists. Carry it over — but only where it still holds the placeholder, so an
-- owner who has already typed their own name in Settings is never overwritten.
UPDATE "settings" SET "studio_name" = 'Artéstar Maison' WHERE "studio_name" = 'Brand Name';