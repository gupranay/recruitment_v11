-- Add source field to comments table
ALTER TABLE comments
ADD COLUMN source TEXT DEFAULT 'R';

-- Add comment to explain the source field
COMMENT ON COLUMN comments.source IS 'Source of the comment: R (Regular), F (Feedback), A (Anonymous)'; 