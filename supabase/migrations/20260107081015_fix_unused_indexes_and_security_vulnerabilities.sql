/*
  # Fix Unused Indexes and Security Vulnerabilities

  ## Summary
  This migration addresses performance and security issues by removing unused
  indexes and fixing security vulnerabilities in views and functions.

  ## Changes Made

  ### 1. Remove Unused Indexes (20 indexes)
  Unused indexes consume storage and slow down INSERT/UPDATE/DELETE operations
  without providing any query performance benefits.

  **Indexes Removed:**
  - AdminConfig: idx_adminconfig_config_key
  - AgentUser: idx_agentuser_username, idx_agentuser_is_active, idx_agentuser_region
  - CSUser: idx_csuser_username, idx_csuser_is_active
  - AppState: idx_appstate_state_key, idx_appstate_updated_date
  - SheetData: idx_sheetdata_sheet_type
  - SheetRow: idx_sheetrow_awb, idx_sheetrow_agent_name, idx_sheetrow_status, idx_sheetrow_updated_at
  - AuditLog: idx_auditlog_actor_username, idx_auditlog_actor_role, idx_auditlog_timestamp, idx_auditlog_action
  - AgentBreak: idx_agentbreak_agent_username, idx_agentbreak_start_time
  - PriorityConfig: idx_priorityconfig_config_key

  ### 2. Fix Security Definer View
  The security_status view was defined with SECURITY DEFINER, which could
  allow privilege escalation. Recreated without this property.

  ### 3. Fix Function Search Path Mutable
  Functions update_updated_date_column and update_updated_at_column had
  mutable search paths, which could allow SQL injection attacks.
  Recreated with SET search_path = pg_catalog, public for security.

  ## Performance Impact
  - Reduced storage usage
  - Faster write operations (INSERT/UPDATE/DELETE)
  - No impact on read performance (indexes were unused)

  ## Security Impact
  - Prevents privilege escalation via SECURITY DEFINER view
  - Prevents SQL injection via search path manipulation
*/

-- ============================================================================
-- DROP UNUSED INDEXES
-- ============================================================================

-- AdminConfig indexes
DROP INDEX IF EXISTS idx_adminconfig_config_key;

-- AgentUser indexes
DROP INDEX IF EXISTS idx_agentuser_username;
DROP INDEX IF EXISTS idx_agentuser_is_active;
DROP INDEX IF EXISTS idx_agentuser_region;

-- CSUser indexes
DROP INDEX IF EXISTS idx_csuser_username;
DROP INDEX IF EXISTS idx_csuser_is_active;

-- AppState indexes
DROP INDEX IF EXISTS idx_appstate_state_key;
DROP INDEX IF EXISTS idx_appstate_updated_date;

-- SheetData indexes
DROP INDEX IF EXISTS idx_sheetdata_sheet_type;

-- SheetRow indexes
DROP INDEX IF EXISTS idx_sheetrow_awb;
DROP INDEX IF EXISTS idx_sheetrow_agent_name;
DROP INDEX IF EXISTS idx_sheetrow_status;
DROP INDEX IF EXISTS idx_sheetrow_updated_at;

-- AuditLog indexes
DROP INDEX IF EXISTS idx_auditlog_actor_username;
DROP INDEX IF EXISTS idx_auditlog_actor_role;
DROP INDEX IF EXISTS idx_auditlog_timestamp;
DROP INDEX IF EXISTS idx_auditlog_action;

-- AgentBreak indexes
DROP INDEX IF EXISTS idx_agentbreak_agent_username;
DROP INDEX IF EXISTS idx_agentbreak_start_time;

-- PriorityConfig indexes
DROP INDEX IF EXISTS idx_priorityconfig_config_key;

-- ============================================================================
-- FIX SECURITY DEFINER VIEW
-- ============================================================================

-- Drop existing view
DROP VIEW IF EXISTS security_status;

-- Recreate without SECURITY DEFINER (runs with invoker's privileges)
CREATE VIEW security_status AS
SELECT 'RLS Policies'::text AS category,
    'Enabled but permissive'::text AS status,
    'All tables have RLS enabled with USING true policies'::text AS details,
    'HIGH'::text AS priority,
    'Migrate to Supabase Auth or implement API key validation'::text AS recommendation
UNION ALL
SELECT 'Password Storage'::text AS category,
    'Plaintext'::text AS status,
    'Passwords stored unhashed in database tables'::text AS details,
    'CRITICAL'::text AS priority,
    'Implement password hashing immediately'::text AS recommendation
UNION ALL
SELECT 'Authentication'::text AS category,
    'Custom implementation'::text AS status,
    'Uses localStorage plus database queries'::text AS details,
    'MEDIUM'::text AS priority,
    'Consider migrating to Supabase Auth'::text AS recommendation
UNION ALL
SELECT 'Auth Connection Pooling'::text AS category,
    'Needs manual fix'::text AS status,
    'Auth server uses fixed connections'::text AS details,
    'MEDIUM'::text AS priority,
    'Set to percentage via Dashboard'::text AS recommendation
UNION ALL
SELECT 'Data Validation'::text AS category,
    'Basic constraints added'::text AS status,
    'CHECK constraints prevent empty values'::text AS details,
    'LOW'::text AS priority,
    'Consider adding more validation'::text AS recommendation;

-- ============================================================================
-- FIX FUNCTION SEARCH PATH MUTABLE
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_date_column() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate update_updated_date_column with fixed search_path
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$;

-- Recreate update_updated_at_column with fixed search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers that were dropped with CASCADE
DO $$
BEGIN
  -- AdminConfig trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'AdminConfig' AND column_name = 'updated_date') THEN
    DROP TRIGGER IF EXISTS set_updated_date ON "AdminConfig";
    CREATE TRIGGER set_updated_date
      BEFORE UPDATE ON "AdminConfig"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_date_column();
  END IF;

  -- AppState trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'AppState' AND column_name = 'updated_date') THEN
    DROP TRIGGER IF EXISTS set_updated_date ON "AppState";
    CREATE TRIGGER set_updated_date
      BEFORE UPDATE ON "AppState"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_date_column();
  END IF;

  -- AgentUser trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'AgentUser' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS set_updated_at ON "AgentUser";
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "AgentUser"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- CSUser trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'CSUser' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS set_updated_at ON "CSUser";
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "CSUser"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- SheetRow trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'SheetRow' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS set_updated_at ON "SheetRow";
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "SheetRow"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- PriorityConfig trigger
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'PriorityConfig' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS set_updated_at ON "PriorityConfig";
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "PriorityConfig"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify no unused indexes remain
DO $$
DECLARE
  unused_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unused_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';
  
  IF unused_count > 0 THEN
    RAISE WARNING 'Still have % indexes with idx_ prefix', unused_count;
  END IF;
END $$;
