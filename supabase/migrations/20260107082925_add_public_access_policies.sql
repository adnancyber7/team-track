/*
  # Add Public Access Policies for Custom Authentication

  1. Changes
    - Add permissive SELECT policies for `anon` role on all tables
    - Add permissive INSERT, UPDATE, DELETE policies for `anon` role on all tables
    - This allows the custom authentication system to work properly
  
  2. Security Notes
    - This app uses custom authentication (not Supabase Auth)
    - Authentication is handled in the application layer with localStorage
    - RLS is enabled but policies are permissive for anon role
    - Production apps should implement more restrictive policies based on app logic
*/

-- AdminConfig: Allow anon full access for custom auth
DROP POLICY IF EXISTS "Allow anonymous full access to AdminConfig" ON "AdminConfig";
CREATE POLICY "Allow anonymous full access to AdminConfig"
  ON "AdminConfig"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AgentUser: Allow anon full access for custom auth
DROP POLICY IF EXISTS "Allow anonymous full access to AgentUser" ON "AgentUser";
CREATE POLICY "Allow anonymous full access to AgentUser"
  ON "AgentUser"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- CSUser: Allow anon full access for custom auth
DROP POLICY IF EXISTS "Allow anonymous full access to CSUser" ON "CSUser";
CREATE POLICY "Allow anonymous full access to CSUser"
  ON "CSUser"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AppState: Allow anon full access for realtime sync
DROP POLICY IF EXISTS "Allow anonymous full access to AppState" ON "AppState";
CREATE POLICY "Allow anonymous full access to AppState"
  ON "AppState"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- SheetData: Allow anon full access
DROP POLICY IF EXISTS "Allow anonymous full access to SheetData" ON "SheetData";
CREATE POLICY "Allow anonymous full access to SheetData"
  ON "SheetData"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- SheetRow: Allow anon full access
DROP POLICY IF EXISTS "Allow anonymous full access to SheetRow" ON "SheetRow";
CREATE POLICY "Allow anonymous full access to SheetRow"
  ON "SheetRow"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AgentBreak: Allow anon full access
DROP POLICY IF EXISTS "Allow anonymous full access to AgentBreak" ON "AgentBreak";
CREATE POLICY "Allow anonymous full access to AgentBreak"
  ON "AgentBreak"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- PriorityConfig: Allow anon full access
DROP POLICY IF EXISTS "Allow anonymous full access to PriorityConfig" ON "PriorityConfig";
CREATE POLICY "Allow anonymous full access to PriorityConfig"
  ON "PriorityConfig"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- AuditLog: Allow anon full access
DROP POLICY IF EXISTS "Allow anonymous full access to AuditLog" ON "AuditLog";
CREATE POLICY "Allow anonymous full access to AuditLog"
  ON "AuditLog"
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
