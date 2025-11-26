-- Add adjustments column to canvas_items if it doesn't exist
-- This stores color adjustment settings (brightness, contrast, saturation)

ALTER TABLE canvas_items 
ADD COLUMN IF NOT EXISTS adjustments JSONB;

-- Add index for adjustments queries (optional, for filtering)
CREATE INDEX IF NOT EXISTS idx_canvas_items_adjustments 
ON canvas_items USING GIN (adjustments);

-- Example adjustments structure:
-- {
--   "brightness": 1.2,
--   "contrast": 1.1,
--   "saturation": 0.9,
--   "hue": 0,
--   "vibrance": 1.0
-- }

