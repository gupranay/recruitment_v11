-- Add archived field to recruitment_cycles table
ALTER TABLE recruitment_cycles
ADD COLUMN archived BOOLEAN DEFAULT false NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN recruitment_cycles.archived IS 'Whether the recruitment cycle is archived. Archived cycles are only visible to Owners and Admins.';
