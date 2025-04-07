-- Add submission_id column to scores table
ALTER TABLE scores
ADD COLUMN submission_id UUID DEFAULT gen_random_uuid();

-- Create an index for faster lookups
CREATE INDEX idx_scores_submission_id ON scores(submission_id);

-- Add a comment to explain the column
COMMENT ON COLUMN scores.submission_id IS 'Groups scores from the same submission together'; 