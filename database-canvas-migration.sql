-- Canvas Tables Migration for ATURE Studio
-- Run this in your Supabase SQL Editor AFTER running database-schema.sql

-- Canvas Items table (stores individual items on the canvas)
CREATE TABLE IF NOT EXISTS canvas_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  x_position DOUBLE PRECISION DEFAULT 0,
  y_position DOUBLE PRECISION DEFAULT 0,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  rotation DOUBLE PRECISION DEFAULT 0,
  scale_x DOUBLE PRECISION DEFAULT 1,
  scale_y DOUBLE PRECISION DEFAULT 1,
  z_index INTEGER DEFAULT 0,
  name TEXT,
  description TEXT,
  prompt TEXT,
  opacity DOUBLE PRECISION DEFAULT 1,
  is_visible BOOLEAN DEFAULT TRUE,
  is_selected BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  filters JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvas States table (stores canvas viewport state: zoom, pan, grid settings, etc.)
CREATE TABLE IF NOT EXISTS canvas_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  zoom_level DOUBLE PRECISION DEFAULT 1,
  pan_x DOUBLE PRECISION DEFAULT 0,
  pan_y DOUBLE PRECISION DEFAULT 0,
  grid_enabled BOOLEAN DEFAULT TRUE,
  grid_size INTEGER DEFAULT 20,
  ruler_enabled BOOLEAN DEFAULT FALSE,
  snap_to_grid BOOLEAN DEFAULT FALSE,
  show_measurements BOOLEAN DEFAULT FALSE,
  background_color TEXT DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_canvas_items_project_id ON canvas_items(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_user_id ON canvas_items(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_z_index ON canvas_items(z_index);
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON canvas_states(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_user_id ON canvas_states(user_id);

-- Add updated_at trigger for canvas_items
DROP TRIGGER IF EXISTS update_canvas_items_updated_at ON canvas_items;
CREATE TRIGGER update_canvas_items_updated_at BEFORE UPDATE ON canvas_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for canvas_states
DROP TRIGGER IF EXISTS update_canvas_states_updated_at ON canvas_states;
CREATE TRIGGER update_canvas_states_updated_at BEFORE UPDATE ON canvas_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies (security handled by API layer with Clerk user_id validation)
DROP POLICY IF EXISTS "Allow all operations on canvas_items" ON canvas_items;
CREATE POLICY "Allow all operations on canvas_items"
  ON canvas_items FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on canvas_states" ON canvas_states;
CREATE POLICY "Allow all operations on canvas_states"
  ON canvas_states FOR ALL
  USING (true)
  WITH CHECK (true);

