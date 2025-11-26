-- Fix script for canvas migration
-- Run this if you get "column z_index does not exist" error

-- First, check and add missing columns to canvas_items if table exists
DO $$
BEGIN
  -- Add z_index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canvas_items' AND column_name = 'z_index'
  ) THEN
    ALTER TABLE canvas_items ADD COLUMN z_index INTEGER DEFAULT 0;
  END IF;

  -- Add other columns that might be missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canvas_items' AND column_name = 'scale_x'
  ) THEN
    ALTER TABLE canvas_items ADD COLUMN scale_x FLOAT DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canvas_items' AND column_name = 'scale_y'
  ) THEN
    ALTER TABLE canvas_items ADD COLUMN scale_y FLOAT DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canvas_items' AND column_name = 'filters'
  ) THEN
    ALTER TABLE canvas_items ADD COLUMN filters JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canvas_items' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE canvas_items ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Now create the index (it will fail gracefully if it already exists)
CREATE INDEX IF NOT EXISTS idx_canvas_items_z_index ON canvas_items(z_index);

