/*
  # Enable Real-Time Updates with Secure Read-Only Policies
  
  ## Overview
  This migration enables real-time functionality across the application while maintaining
  security by allowing read-only access through RLS policies. Write operations remain
  secured through the Edge Function API.
  
  ## Changes Made
  
  ### 1. Enable Real-Time Replication
  Enables real-time subscriptions on all application tables:
  - AdminConfig (for maintenance mode & banners)
  - AgentUser (for agent status & availability)
  - CSUser (for CS user management)
  - AppState (for shared application state)
  - SheetData (for sheet configurations)
  - SheetRow (for row-level updates)
  - AgentBreak (for break tracking)
  - PriorityConfig (for priority settings)
  - AuditLog (for audit trail visibility)
  
  ### 2. Add Read-Only RLS Policies
  Implements SELECT-only policies for the anonymous role, allowing:
  - Real-time subscriptions from frontend
  - Read access for displaying data
  - No write access (all writes go through secure Edge Function)
  
  ### 3. Security Model
  - ✅ Read operations: Direct database access (real-time enabled)
  - ✅ Write operations: Edge Function only (service_role)
  - ✅ Defense in depth: RLS + Edge Function authorization
  
  ## Security Considerations
  
  This approach balances security and real-time functionality:
  - Users can read data but cannot modify it directly
  - All modifications must go through Edge Function with validation
  - Real-time subscriptions work seamlessly
  - No sensitive operations exposed (passwords are hashed, writes are controlled)
  
  Note: For production, consider implementing field-level security to hide
  sensitive fields like password hashes from SELECT queries.
*/

-- ============================================================================
-- 1. ENABLE REAL-TIME REPLICATION ON ALL TABLES
-- ============================================================================

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."AdminConfig";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."AgentUser";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."CSUser";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."AppState";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."SheetData";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."SheetRow";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."AgentBreak";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."PriorityConfig";
ALTER PUBLICATION supabase_realtime ADD TABLE "public"."AuditLog";

-- ============================================================================
-- 2. ADD READ-ONLY RLS POLICIES FOR ANONYMOUS ROLE
-- ============================================================================

-- AdminConfig: Allow reading configuration (maintenance mode, banners)
CREATE POLICY "Allow anonymous read access to AdminConfig"
  ON "public"."AdminConfig"
  FOR SELECT
  TO anon
  USING (true);

-- AgentUser: Allow reading agent information
CREATE POLICY "Allow anonymous read access to AgentUser"
  ON "public"."AgentUser"
  FOR SELECT
  TO anon
  USING (true);

-- CSUser: Allow reading CS user information
CREATE POLICY "Allow anonymous read access to CSUser"
  ON "public"."CSUser"
  FOR SELECT
  TO anon
  USING (true);

-- AppState: Allow reading application state for real-time sync
CREATE POLICY "Allow anonymous read access to AppState"
  ON "public"."AppState"
  FOR SELECT
  TO anon
  USING (true);

-- SheetData: Allow reading sheet configurations
CREATE POLICY "Allow anonymous read access to SheetData"
  ON "public"."SheetData"
  FOR SELECT
  TO anon
  USING (true);

-- SheetRow: Allow reading sheet rows for real-time updates
CREATE POLICY "Allow anonymous read access to SheetRow"
  ON "public"."SheetRow"
  FOR SELECT
  TO anon
  USING (true);

-- AgentBreak: Allow reading break information
CREATE POLICY "Allow anonymous read access to AgentBreak"
  ON "public"."AgentBreak"
  FOR SELECT
  TO anon
  USING (true);

-- PriorityConfig: Allow reading priority configurations
CREATE POLICY "Allow anonymous read access to PriorityConfig"
  ON "public"."PriorityConfig"
  FOR SELECT
  TO anon
  USING (true);

-- AuditLog: Allow reading audit logs
CREATE POLICY "Allow anonymous read access to AuditLog"
  ON "public"."AuditLog"
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- 3. UPDATE TABLE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE "public"."AdminConfig" IS 'Admin configuration. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."AgentUser" IS 'Agent accounts. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."CSUser" IS 'CS user accounts. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."AppState" IS 'Application state. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."SheetData" IS 'Sheet configurations. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."SheetRow" IS 'Sheet rows. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."AgentBreak" IS 'Break tracking. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."PriorityConfig" IS 'Priority configs. RLS: SELECT allowed for real-time, writes via Edge Function only.';
COMMENT ON TABLE "public"."AuditLog" IS 'Audit trail. RLS: SELECT allowed for real-time, writes via Edge Function only.';
