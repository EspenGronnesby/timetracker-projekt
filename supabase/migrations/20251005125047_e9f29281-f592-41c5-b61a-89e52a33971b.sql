-- Fix the SELECT policy for organizations table
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;

CREATE POLICY "Users can view organizations they belong to"
ON organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_organizations uo
    WHERE uo.organization_id = organizations.id 
    AND uo.user_id = auth.uid()
  )
);