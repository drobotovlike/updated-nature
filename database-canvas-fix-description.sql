-- Fix: Add missing description column to canvas_items table
-- Run this if you get: "Could not find the 'description' column"

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'canvas_items' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE canvas_items ADD COLUMN description TEXT;
    RAISE NOTICE 'Added description column to canvas_items';
  ELSE
    RAISE NOTICE 'Description column already exists';
  END IF;
END $$;

