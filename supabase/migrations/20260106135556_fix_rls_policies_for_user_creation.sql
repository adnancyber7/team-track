/*
  # Fix RLS Policies for User Creation

  1. Changes
    - Add INSERT, UPDATE, DELETE policies for public/anon role on AgentUser table
    - Add INSERT, UPDATE, DELETE policies for public/anon role on CSUser table
    - Allow frontend to create and manage users without authentication
  
  2. Security
    - Policies allow public access since the app uses Base44 SDK without auth
    - Service role retains full access
    - All tables maintain RLS enabled
*/

-- Drop existing restrictive policies and add permissive ones for AgentUser
DROP POLICY IF EXISTS "Authenticated users can read AgentUser" ON "AgentUser";

CREATE POLICY "Public can read AgentUser"
  ON "AgentUser"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert AgentUser"
  ON "AgentUser"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update AgentUser"
  ON "AgentUser"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete AgentUser"
  ON "AgentUser"
  FOR DELETE
  TO public
  USING (true);

-- Drop existing restrictive policies and add permissive ones for CSUser
DROP POLICY IF EXISTS "Authenticated users can read CSUser" ON "CSUser";

CREATE POLICY "Public can read CSUser"
  ON "CSUser"
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert CSUser"
  ON "CSUser"
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update CSUser"
  ON "CSUser"
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete CSUser"
  ON "CSUser"
  FOR DELETE
  TO public
  USING (true);
