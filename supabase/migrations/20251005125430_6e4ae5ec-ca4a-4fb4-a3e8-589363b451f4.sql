-- Fix 1: Allow authenticated users to create organizations
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

CREATE POLICY "Users can create organizations"
ON organizations 
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix 2: Update time_entries SELECT policy to check organization membership through projects
DROP POLICY IF EXISTS "Users can view time entries in same organization" ON time_entries;

CREATE POLICY "Users can view time entries in same organization"
ON time_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN user_organizations uo ON uo.organization_id = p.organization_id
    WHERE p.id = time_entries.project_id 
    AND uo.user_id = auth.uid()
  )
);

-- Fix 3: Update drive_entries SELECT policy to check organization membership through projects
DROP POLICY IF EXISTS "Users can view drive entries in same organization" ON drive_entries;

CREATE POLICY "Users can view drive entries in same organization"
ON drive_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN user_organizations uo ON uo.organization_id = p.organization_id
    WHERE p.id = drive_entries.project_id 
    AND uo.user_id = auth.uid()
  )
);

-- Fix 4: Update materials SELECT policy to check organization membership through projects
DROP POLICY IF EXISTS "Users can view materials in same organization" ON materials;

CREATE POLICY "Users can view materials in same organization"
ON materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    INNER JOIN user_organizations uo ON uo.organization_id = p.organization_id
    WHERE p.id = materials.project_id 
    AND uo.user_id = auth.uid()
  )
);

-- Fix 5: Update user_roles SELECT policy to check organization membership
DROP POLICY IF EXISTS "Users can view roles in same organization" ON user_roles;

CREATE POLICY "Users can view roles in same organization"
ON user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    INNER JOIN profiles p2 ON p1.organization_number = p2.organization_number
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND p1.organization_number IS NOT NULL
    AND p2.organization_number IS NOT NULL
  )
);

-- Fix 6: Update profiles SELECT policy to use proper organization check
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON profiles;

CREATE POLICY "Users can view profiles in same organization"
ON profiles
FOR SELECT
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_organizations uo1
    INNER JOIN user_organizations uo2 ON uo1.organization_id = uo2.organization_id
    WHERE uo1.user_id = auth.uid()
    AND uo2.user_id = profiles.id
  )
);