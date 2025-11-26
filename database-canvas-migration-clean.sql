-- Canvas Migration - Run this in Supabase SQL Editor
-- Make sure to run each section separately if you encounter errors

-- Step 1: Create canvas_items table
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

-- Step 2: Create indexes for canvas_items
CREATE INDEX IF NOT EXISTS idx_canvas_items_project_id ON canvas_items(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_user_id ON canvas_items(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_z_index ON canvas_items(z_index);

-- Step 3: Create canvas_states table
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

-- Step 4: Create indexes for canvas_states
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON canvas_states(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_user_id ON canvas_states(user_id);

-- Step 5: Enable RLS
ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Enable all operations for canvas_items" ON canvas_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for canvas_states" ON canvas_states
  FOR ALL USING (true) WITH CHECK (true);

-- Step 7: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_canvas_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create triggers
CREATE TRIGGER update_canvas_items_updated_at
  BEFORE UPDATE ON canvas_items
  FOR EACH ROW
  EXECUTE FUNCTION update_canvas_items_updated_at();

CREATE TRIGGER update_canvas_states_updated_at
  BEFORE UPDATE ON canvas_states
  FOR EACH ROW
  EXECUTE FUNCTION update_canvas_items_updated_at();

