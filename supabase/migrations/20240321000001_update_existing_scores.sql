-- Update existing scores to have proper submission_id values
WITH grouped_scores AS (
  SELECT 
    applicant_round_id,
    user_id,
    created_at,
    gen_random_uuid() as new_submission_id
  FROM scores
  GROUP BY applicant_round_id, user_id, created_at
)
UPDATE scores s
SET submission_id = g.new_submission_id
FROM grouped_scores g
WHERE s.applicant_round_id = g.applicant_round_id
  AND s.user_id = g.user_id
  AND s.created_at = g.created_at;

-- Add a comment to explain the purpose of this migration
COMMENT ON COLUMN scores.submission_id IS 'Groups scores that were submitted together by the same user at the same time'; 