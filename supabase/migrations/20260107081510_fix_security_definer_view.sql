/*
  # Fix Security Definer View

  1. Changes
    - Explicitly recreate `security_status` view with SECURITY INVOKER
    - This ensures the view runs with the privileges of the user calling it, not the creator
    - Prevents potential privilege escalation vulnerabilities

  2. Security
    - Removes any potential SECURITY DEFINER property
    - View now explicitly uses SECURITY INVOKER for clarity

  3. Notes
    - Auth DB Connection Strategy must be changed manually in Supabase Dashboard:
      Project Settings → Database → Connection Pooling → Change from "Fixed" to "Percentage"
*/

-- Drop existing view
DROP VIEW IF EXISTS public.security_status;

-- Recreate view with explicit SECURITY INVOKER
CREATE VIEW public.security_status 
WITH (security_invoker = true)
AS
SELECT 
  'RLS Policies'::text AS category,
  'Enabled but permissive'::text AS status,
  'All tables have RLS enabled with USING true policies'::text AS details,
  'HIGH'::text AS priority,
  'Migrate to Supabase Auth or implement API key validation'::text AS recommendation
UNION ALL
SELECT 
  'Password Storage'::text AS category,
  'Plaintext'::text AS status,
  'Passwords stored unhashed in database tables'::text AS details,
  'CRITICAL'::text AS priority,
  'Implement password hashing immediately'::text AS recommendation
UNION ALL
SELECT 
  'Authentication'::text AS category,
  'Custom implementation'::text AS status,
  'Uses localStorage plus database queries'::text AS details,
  'MEDIUM'::text AS priority,
  'Consider migrating to Supabase Auth'::text AS recommendation
UNION ALL
SELECT 
  'Auth Connection Pooling'::text AS category,
  'Needs manual fix'::text AS status,
  'Auth server uses fixed connections'::text AS details,
  'MEDIUM'::text AS priority,
  'Set to percentage via Dashboard'::text AS recommendation
UNION ALL
SELECT 
  'Data Validation'::text AS category,
  'Basic constraints added'::text AS status,
  'CHECK constraints prevent empty values'::text AS details,
  'LOW'::text AS priority,
  'Consider adding more validation'::text AS recommendation;
