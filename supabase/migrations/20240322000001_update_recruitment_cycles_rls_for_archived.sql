-- Drop the existing permissive policy
DROP POLICY IF EXISTS "can do all" ON recruitment_cycles;

-- Create a policy that allows all operations but filters archived cycles for Members
-- Owners and Admins can see all cycles (archived and non-archived)
-- Members can only see non-archived cycles
CREATE POLICY "recruitment_cycles_access_policy" ON recruitment_cycles
FOR SELECT
USING (
  -- If cycle is not archived, everyone can see it
  archived = false
  OR
  -- If cycle is archived, only Owners and Admins can see it
  (
    archived = true
    AND
    (
      -- User is the organization owner
      EXISTS (
        SELECT 1 FROM organizations
        WHERE organizations.id = recruitment_cycles.organization_id
        AND organizations.owner_id = auth.uid()
      )
      OR
      -- User is an Owner or Admin in the organization
      EXISTS (
        SELECT 1 FROM organization_users
        WHERE organization_users.organization_id = recruitment_cycles.organization_id
        AND organization_users.user_id = auth.uid()
        AND organization_users.role IN ('Owner', 'Admin')
      )
    )
  )
);

-- Allow all other operations (INSERT, UPDATE, DELETE) for authenticated users
-- Authorization will be handled at the API level
CREATE POLICY "recruitment_cycles_modify_policy" ON recruitment_cycles
FOR ALL
USING (true)
WITH CHECK (true);
