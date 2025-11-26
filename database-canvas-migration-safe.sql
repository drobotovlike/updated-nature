-- Safe Canvas Migration - Handles existing tables gracefully
-- Run this if the previous migration partially completed

-- Step 1: Drop existing table if you want a fresh start (UNCOMMENT IF NEEDED)
-- DROP TABLE IF EXISTS canvas_items CASCADE;
-- DROP TABLE IF EXISTS canvas_states CASCADE;

-- Step 2: Create canvas_items table (or alter if exists)
CREATE TABLE IF NOT EXISTS canvas_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  x_position FLOAT NOT NULL DEFAULT 0,
  y_position FLOAT NOT NULL DEFAULT 0,
  width FLOAT,
  height FLOAT,
  rotation FLOAT DEFAULT 0,
  scale_x FLOAT DEFAULT 1,
  scale_y FLOAT DEFAULT 1,
  z_index INTEGER DEFAULT 0,
  name TEXT,
  description TEXT,
  prompt TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  opacity FLOAT DEFAULT 1,
  filters JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add missing columns if table already existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_items' AND column_name = 'z_index') THEN
    ALTER TABLE canvas_items ADD COLUMN z_index INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_items' AND column_name = 'scale_x') THEN
    ALTER TABLE canvas_items ADD COLUMN scale_x FLOAT DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_items' AND column_name = 'scale_y') THEN
    ALTER TABLE canvas_items ADD COLUMN scale_y FLOAT DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_items' AND column_name = 'filters') THEN
    ALTER TABLE canvas_items ADD COLUMN filters JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'canvas_items' AND column_name = 'metadata') THEN
    ALTER TABLE canvas_items ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_canvas_items_project_id ON canvas_items(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_user_id ON canvas_items(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_z_index ON canvas_items(z_index);

-- Step 5: Create canvas_states table
CREATE TABLE IF NOT EXISTS canvas_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  user_id TEXT NOT NULL,
  zoom_level FLOAT DEFAULT 1,
  pan_x FLOAT DEFAULT 0,
  pan_y FLOAT DEFAULT 0,
  grid_enabled BOOLEAN DEFAULT TRUE,
  grid_size INTEGER DEFAULT 20,
  ruler_enabled BOOLEAN DEFAULT FALSE,
  snap_to_grid BOOLEAN DEFAULT TRUE,
  show_measurements BOOLEAN DEFAULT TRUE,
  background_color TEXT DEFAULT '#fafaf9',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for canvas_states
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON canvas_states(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_user_id ON canvas_states(user_id);

-- Step 7: Enable RLS
ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Enable all operations for canvas_items" ON canvas_items;
CREATE POLICY "Enable all operations for canvas_items" ON canvas_items
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all operations for canvas_states" ON canvas_states;
CREATE POLICY "Enable all operations for canvas_states" ON canvas_states
  FOR ALL USING (true) WITH CHECK (true);

-- Step 9: Create trigger function
CREATE OR REPLACE FUNCTION update_canvas_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_canvas_items_updated_at ON canvas_items;
CREATE TRIGGER update_canvas_items_updated_at
  BEFORE UPDATE ON canvas_items
  FOR EACH ROW
  EXECUTE FUNCTION update_canvas_items_updated_at();

DROP TRIGGER IF EXISTS update_canvas_states_updated_at ON canvas_states;
CREATE TRIGGER update_canvas_states_updated_at
  BEFORE UPDATE ON canvas_states
  FOR EACH ROW
  EXECUTE FUNCTION update_canvas_items_updated_at();

