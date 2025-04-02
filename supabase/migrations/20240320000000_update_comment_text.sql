-- Update the comment_text column to handle HTML content
ALTER TABLE comments
ALTER COLUMN comment_text TYPE text;

-- Add a comment to the column to indicate it contains HTML
COMMENT ON COLUMN comments.comment_text IS 'HTML content of the comment'; 