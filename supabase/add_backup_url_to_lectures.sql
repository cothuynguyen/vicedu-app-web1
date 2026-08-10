-- Add backup_url column to lectures table
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS backup_url TEXT;
