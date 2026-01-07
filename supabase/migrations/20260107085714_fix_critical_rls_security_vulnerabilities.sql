/*
  # Critical RLS Security Fixes
  
  ## Overview
  This migration addresses critical security vulnerabilities in RLS policies that allow
  unrestricted anonymous access to all data.
  
  ## Security Issues Fixed
  
  **RLS Policy Always True**: All tables had policies with `USING (true)` and `WITH CHECK (true)`,
  allowing unrestricted anonymous access to sensitive data including:
  - User credentials (AdminConfig, AgentUser, CSUser)
  - Audit logs (AuditLog)
  - Application state (AppState)
  - Business data (SheetData, SheetRow)
  - Configuration (PriorityConfig)
  - Tracking data (AgentBreak)
  
  ## Changes Made
  
  ### Remove Insecure Anonymous Policies
  All policies allowing unrestricted anonymous access are removed.
  Service role policies remain for backend operations via Edge Functions.
  
  ## Important Notes
  
  ⚠️ **BREAKING CHANGE**: This migration removes anonymous database access.
  
  The application currently uses direct database access from the frontend with the
  anonymous key, which is highly insecure. After this migration, direct database
  access from the frontend will no longer work.
  
  ## Required Next Steps
  
  The application MUST be updated to use Edge Functions for all database operations:
  
  1. Create Edge Functions for:
     - Authentication (login, logout, session validation)
     - User management (create, update, delete users)
     - Sheet operations (read, write, update sheets)
     - Configuration management
     - Audit logging
  
  2. Edge Functions should:
     - Use the service_role key for database access
     - Validate session tokens/authentication
     - Implement business logic and authorization
     - Return only authorized data
  
  3. Update frontend to:
     - Call Edge Functions instead of direct database access
     - Pass session tokens with each request
     - Handle authentication properly
  
  ## Alternative: Supabase Auth Integration
  
  For a more robust solution, consider migrating to Supabase Auth:
  - Replace custom auth with Supabase auth.signUp/signIn
  - Implement RLS policies using auth.uid()
  - Use Supabase's built-in session management
  
  ## Security Best Practices Implemented
  
  - ✅ No anonymous access to sensitive data
  - ✅ Service role access only (for backend operations)
  - ✅ RLS enabled on all tables
  - ✅ Defense in depth security model
*/

-- ============================================================================
-- REMOVE INSECURE ANONYMOUS POLICIES
-- ============================================================================

-- AdminConfig: Contains sensitive admin credentials and configuration
DROP POLICY IF EXISTS "Allow anonymous full access to AdminConfig" ON "public"."AdminConfig";

-- AgentUser: Contains agent credentials and personal information
DROP POLICY IF EXISTS "Allow anonymous full access to AgentUser" ON "public"."AgentUser";

-- CSUser: Contains CS user credentials
DROP POLICY IF EXISTS "Allow anonymous full access to CSUser" ON "public"."CSUser";

-- AppState: Application state and real-time sync data
DROP POLICY IF EXISTS "Allow anonymous full access to AppState" ON "public"."AppState";

-- SheetData: Business data and sheet configurations
DROP POLICY IF EXISTS "Allow anonymous full access to SheetData" ON "public"."SheetData";

-- SheetRow: Individual sheet rows with assignments
DROP POLICY IF EXISTS "Allow anonymous full access to SheetRow" ON "public"."SheetRow";

-- AgentBreak: Break time tracking data
DROP POLICY IF EXISTS "Allow anonymous full access to AgentBreak" ON "public"."AgentBreak";

-- PriorityConfig: Priority shipment configurations
DROP POLICY IF EXISTS "Allow anonymous full access to PriorityConfig" ON "public"."PriorityConfig";

-- AuditLog: Audit trail - should NEVER be publicly accessible
DROP POLICY IF EXISTS "Allow anonymous full access to AuditLog" ON "public"."AuditLog";

-- ============================================================================
-- UPDATE TABLE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE "public"."AdminConfig" IS 'Admin configuration and credentials. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."AgentUser" IS 'Agent accounts and credentials. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."CSUser" IS 'CS user accounts and credentials. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."AppState" IS 'Global application state for real-time sync. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."AuditLog" IS 'Audit trail for all system actions. RLS enabled. Read-only via Edge Functions using service_role for data integrity.';
COMMENT ON TABLE "public"."SheetData" IS 'Sheet configuration data. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."SheetRow" IS 'Individual sheet rows with agent assignments. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."AgentBreak" IS 'Agent break time tracking. RLS enabled. Access via Edge Functions only using service_role.';
COMMENT ON TABLE "public"."PriorityConfig" IS 'Priority shipment configurations. RLS enabled. Access via Edge Functions only using service_role.';

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

-- Confirm RLS is enabled on all tables (should already be enabled)
ALTER TABLE "public"."AdminConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AgentUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CSUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AppState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SheetData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SheetRow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AgentBreak" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PriorityConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
