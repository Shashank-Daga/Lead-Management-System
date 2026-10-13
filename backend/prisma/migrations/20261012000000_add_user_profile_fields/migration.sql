-- Profile fields are nullable so existing users remain valid.
-- IF NOT EXISTS avoids duplicate-column errors if a field was
-- previously added manually in a development database.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE,
  ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
  