-- Add flip/mirror columns to canvas_items table
-- Run this in your Supabase SQL Editor

ALTER TABLE canvas_items 
ADD COLUMN IF NOT EXISTS flip_horizontal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flip_vertical BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN canvas_items.flip_horizontal IS 'Whether the image is flipped horizontally (mirrored)';
COMMENT ON COLUMN canvas_items.flip_vertical IS 'Whether the image is flipped vertically';

