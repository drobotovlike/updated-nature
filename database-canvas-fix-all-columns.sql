-- Quick Fix: Add ALL missing columns to canvas_items table
-- Run this if you're getting "Could not find the 'X' column" errors

-- Add all columns that might be missing
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS width FLOAT;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS height FLOAT;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS rotation FLOAT DEFAULT 0;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS scale_x FLOAT DEFAULT 1;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS scale_y FLOAT DEFAULT 1;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT FALSE;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS opacity FLOAT DEFAULT 1;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS filters JSONB;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE canvas_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'canvas_items' 
ORDER BY ordinal_position;

