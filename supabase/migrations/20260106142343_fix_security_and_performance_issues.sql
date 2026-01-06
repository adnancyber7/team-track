/*
  # Fix Security and Performance Issues

  ## Summary
  This migration addresses critical security and performance issues identified by Supabase:
  
  ## 1. Remove Duplicate RLS Policies
  - All tables had both "Public can X" and "Service role has full access" policies
  - These duplicate permissive policies create confusion and performance overhead
  - Since public role already has full access (USING true), service role policies are redundant
  - **Action**: Drop all "Service role has full access" policies
  
  ## 2. Drop Unused Indexes
  - Multiple indexes have not been used and add unnecessary write overhead
  - **Action**: Remove 16 unused indexes across all tables
  
  ## 3. Fix Function Search Path Issues
  - Functions `update_updated_at_column` and `update_updated_date_column` have mutable search paths
  - This is a security concern as it could allow search path injection
  - **Action**: Set explicit search path for these functions
  
  ## Tables Affected
  - AdminConfig, AgentUser, CSUser, AppState, SheetData, SheetRow
  - AgentBreak, PriorityConfig, AuditLog
  
  ## Security Notes
  - App intentionally uses public access (requiresAuth: false in Base44 SDK)
  - RLS remains enabled on all tables
  - Public policies maintained for application functionality
*/

-- ============================================================================
-- 1. DROP DUPLICATE SERVICE ROLE POLICIES
-- ============================================================================

-- These policies are redundant since public role already has full access
DROP POLICY IF EXISTS "Service role has full access to AdminConfig" ON "AdminConfig";
DROP POLICY IF EXISTS "Service role has full access to AgentUser" ON "AgentUser";
DROP POLICY IF EXISTS "Service role has full access to CSUser" ON "CSUser";
DROP POLICY IF EXISTS "Service role has full access to AppState" ON "AppState";
DROP POLICY IF EXISTS "Service role has full access to SheetData" ON "SheetData";
DROP POLICY IF EXISTS "Service role has full access to SheetRow" ON "SheetRow";
DROP POLICY IF EXISTS "Service role has full access to AgentBreak" ON "AgentBreak";
DROP POLICY IF EXISTS "Service role has full access to PriorityConfig" ON "PriorityConfig";
DROP POLICY IF EXISTS "Service role has full access to AuditLog" ON "AuditLog";

-- ============================================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================================

-- AgentUser indexes
DROP INDEX IF EXISTS "idx_agentuser_username";
DROP INDEX IF EXISTS "idx_agentuser_is_active";

-- CSUser indexes
DROP INDEX IF EXISTS "idx_csuser_username";
DROP INDEX IF EXISTS "idx_csuser_is_active";

-- AdminConfig indexes
DROP INDEX IF EXISTS "idx_adminconfig_config_key";

-- AgentBreak indexes
DROP INDEX IF EXISTS "idx_agentbreak_start_time";
DROP INDEX IF EXISTS "idx_agentbreak_agent_username";

-- AppState indexes
DROP INDEX IF EXISTS "idx_appstate_state_key";

-- SheetData indexes
DROP INDEX IF EXISTS "idx_sheetdata_sheet_type";

-- SheetRow indexes
DROP INDEX IF EXISTS "idx_sheetrow_awb";
DROP INDEX IF EXISTS "idx_sheetrow_agent_name";
DROP INDEX IF EXISTS "idx_sheetrow_status";

-- PriorityConfig indexes
DROP INDEX IF EXISTS "idx_priorityconfig_config_key";

-- AuditLog indexes
DROP INDEX IF EXISTS "idx_auditlog_action";
DROP INDEX IF EXISTS "idx_auditlog_actor";
DROP INDEX IF EXISTS "idx_auditlog_timestamp";

-- ============================================================================
-- 3. FIX FUNCTION SEARCH PATH SECURITY
-- ============================================================================

-- Fix update_updated_at_column function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix update_updated_date_column function
DROP FUNCTION IF EXISTS update_updated_date_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_date_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$;

-- Recreate triggers for tables using these functions
-- AgentUser
DROP TRIGGER IF EXISTS update_agentuser_updated_at ON "AgentUser";
CREATE TRIGGER update_agentuser_updated_at
    BEFORE UPDATE ON "AgentUser"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- CSUser
DROP TRIGGER IF EXISTS update_csuser_updated_at ON "CSUser";
CREATE TRIGGER update_csuser_updated_at
    BEFORE UPDATE ON "CSUser"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SheetRow
DROP TRIGGER IF EXISTS update_sheetrow_updated_at ON "SheetRow";
CREATE TRIGGER update_sheetrow_updated_at
    BEFORE UPDATE ON "SheetRow"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- PriorityConfig
DROP TRIGGER IF EXISTS update_priorityconfig_updated_at ON "PriorityConfig";
CREATE TRIGGER update_priorityconfig_updated_at
    BEFORE UPDATE ON "PriorityConfig"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- AdminConfig (uses updated_date)
DROP TRIGGER IF EXISTS update_adminconfig_updated_date ON "AdminConfig";
CREATE TRIGGER update_adminconfig_updated_date
    BEFORE UPDATE ON "AdminConfig"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_date_column();

-- AppState (uses updated_date)
DROP TRIGGER IF EXISTS update_appstate_updated_date ON "AppState";
CREATE TRIGGER update_appstate_updated_date
    BEFORE UPDATE ON "AppState"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_date_column();
