/*
  # Create AuditLog Table

  1. New Tables
    - `AuditLog`
      - `id` (uuid, primary key)
      - `action` (text) - Type of action performed
      - `actor_username` (text) - Username of the person performing the action
      - `actor_role` (text) - Role of the actor (admin, agent, cs_allocator)
      - `target_type` (text) - Type of target being acted upon
      - `target_identifier` (text) - Identifier of the target
      - `timestamp` (bigint) - Timestamp of the action
      - `metadata` (jsonb) - Additional metadata
      - `created_at` (timestamptz) - Record creation time
  
  2. Security
    - Enable RLS on `AuditLog` table
    - Add policies for public access (consistent with app architecture)
*/

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_username text,
  actor_role text,
  target_type text,
  target_identifier text,
  timestamp bigint,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to AuditLog"
  ON "AuditLog"
  FOR ALL
  TO public
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can read AuditLog"
  ON "AuditLog"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert AuditLog"
  ON "AuditLog"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update AuditLog"
  ON "AuditLog"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete AuditLog"
  ON "AuditLog"
  FOR DELETE
  TO public
  USING (true);

CREATE INDEX IF NOT EXISTS idx_auditlog_action ON "AuditLog"(action);
CREATE INDEX IF NOT EXISTS idx_auditlog_actor ON "AuditLog"(actor_username);
CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON "AuditLog"(timestamp);
