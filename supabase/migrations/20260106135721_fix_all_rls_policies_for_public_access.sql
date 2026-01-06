/*
  # Fix All RLS Policies for Public Access

  1. Changes
    - Update all tables to allow public access for all operations
    - App uses Base44 SDK without authentication (requiresAuth: false)
    - All operations must work for anonymous/public users
  
  2. Tables Updated
    - AdminConfig: Add INSERT, UPDATE, DELETE policies
    - AppState: Add DELETE policy
    - AgentBreak: Add DELETE policy
    - PriorityConfig: Add DELETE policy
    - SheetData: Add UPDATE, DELETE policies
    - SheetRow: Add DELETE policy
  
  3. Security
    - Public access required for app to function
    - Service role retains full access
    - All tables maintain RLS enabled
*/

-- AdminConfig: Add missing policies
DROP POLICY IF EXISTS "Authenticated users can read AdminConfig" ON "AdminConfig";

CREATE POLICY "Public can read AdminConfig"
  ON "AdminConfig"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert AdminConfig"
  ON "AdminConfig"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update AdminConfig"
  ON "AdminConfig"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete AdminConfig"
  ON "AdminConfig"
  FOR DELETE
  TO public
  USING (true);

-- AppState: Add missing policies
DROP POLICY IF EXISTS "Authenticated users can read AppState" ON "AppState";
DROP POLICY IF EXISTS "Authenticated users can insert AppState" ON "AppState";
DROP POLICY IF EXISTS "Authenticated users can update AppState" ON "AppState";

CREATE POLICY "Public can read AppState"
  ON "AppState"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert AppState"
  ON "AppState"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update AppState"
  ON "AppState"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete AppState"
  ON "AppState"
  FOR DELETE
  TO public
  USING (true);

-- AgentBreak: Add missing policies
DROP POLICY IF EXISTS "Authenticated users can read AgentBreak" ON "AgentBreak";
DROP POLICY IF EXISTS "Authenticated users can insert AgentBreak" ON "AgentBreak";
DROP POLICY IF EXISTS "Authenticated users can update AgentBreak" ON "AgentBreak";

CREATE POLICY "Public can read AgentBreak"
  ON "AgentBreak"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert AgentBreak"
  ON "AgentBreak"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update AgentBreak"
  ON "AgentBreak"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete AgentBreak"
  ON "AgentBreak"
  FOR DELETE
  TO public
  USING (true);

-- PriorityConfig: Add missing policies
DROP POLICY IF EXISTS "Authenticated users can read PriorityConfig" ON "PriorityConfig";
DROP POLICY IF EXISTS "Authenticated users can insert PriorityConfig" ON "PriorityConfig";
DROP POLICY IF EXISTS "Authenticated users can update PriorityConfig" ON "PriorityConfig";

CREATE POLICY "Public can read PriorityConfig"
  ON "PriorityConfig"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert PriorityConfig"
  ON "PriorityConfig"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update PriorityConfig"
  ON "PriorityConfig"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete PriorityConfig"
  ON "PriorityConfig"
  FOR DELETE
  TO public
  USING (true);

-- SheetData: Add missing policies
DROP POLICY IF EXISTS "Authenticated users can read SheetData" ON "SheetData";
DROP POLICY IF EXISTS "Authenticated users can insert SheetData" ON "SheetData";

CREATE POLICY "Public can read SheetData"
  ON "SheetData"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert SheetData"
  ON "SheetData"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update SheetData"
  ON "SheetData"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete SheetData"
  ON "SheetData"
  FOR DELETE
  TO public
  USING (true);

-- SheetRow: Add missing policies
DROP POLICY IF EXISTS "Authenticated users can read SheetRow" ON "SheetRow";
DROP POLICY IF EXISTS "Authenticated users can insert SheetRow" ON "SheetRow";
DROP POLICY IF EXISTS "Authenticated users can update SheetRow" ON "SheetRow";

CREATE POLICY "Public can read SheetRow"
  ON "SheetRow"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert SheetRow"
  ON "SheetRow"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update SheetRow"
  ON "SheetRow"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete SheetRow"
  ON "SheetRow"
  FOR DELETE
  TO public
  USING (true);
