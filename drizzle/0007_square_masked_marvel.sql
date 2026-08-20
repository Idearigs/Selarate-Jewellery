ALTER TABLE "settings" ALTER COLUMN "studio_name" SET DEFAULT 'Sélarté';--> statement-breakpoint
-- A changed DEFAULT only applies to new rows, and the settings row already
-- exists. Carry it over — but only where it still holds a name this project
-- put there itself, so an owner who has typed their own name in Settings is
-- never overwritten. 'Brand Name' was the original placeholder; 'Artéstar
-- Maison' was the name this replaces.
UPDATE "settings" SET "studio_name" = 'Sélarté'
  WHERE "studio_name" IN ('Brand Name', 'Artéstar Maison');
