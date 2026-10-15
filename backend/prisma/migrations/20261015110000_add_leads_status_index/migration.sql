-- Speeds up status filters and the dashboard's status counts.
-- IF NOT EXISTS keeps this safe to re-run.
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
