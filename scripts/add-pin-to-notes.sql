-- Add is_pinned column to run_notes table
ALTER TABLE run_notes 
ADD COLUMN is_pinned BOOLEAN DEFAULT false;

-- Create index for faster pinned note queries
CREATE INDEX idx_run_notes_pinned ON run_notes(run_id, is_pinned) WHERE is_pinned = true;

-- Optional: Add constraint to allow only one pinned note per run
-- Uncomment if you want this restriction:
-- CREATE UNIQUE INDEX idx_run_notes_one_pinned_per_run 
-- ON run_notes(run_id) WHERE is_pinned = true;
