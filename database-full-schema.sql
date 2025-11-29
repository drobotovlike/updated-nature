-- ATURE Studio - Complete Database Schema
-- Run this in your Supabase SQL Editor
-- This includes all tables needed for the application

-- ============================================
-- PART 1: Core Schema (database-schema.sql)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Spaces table (must be created first since projects references it)
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table (references spaces, so must be created after)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  workflow JSONB DEFAULT '{}'::jsonb,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project files table (for storing file metadata)
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets table (private asset library - each user only sees their own assets)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: Canvas Tables (database-canvas-migration.sql)
-- ============================================

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

-- ============================================
-- PART 3: Indexes
-- ============================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_space_id ON projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted);
CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_deleted ON spaces(deleted);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);

-- Canvas table indexes
CREATE INDEX IF NOT EXISTS idx_canvas_items_project_id ON canvas_items(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_user_id ON canvas_items(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_items_z_index ON canvas_items(z_index);
CREATE INDEX IF NOT EXISTS idx_canvas_states_project_id ON canvas_states(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_states_user_id ON canvas_states(user_id);

-- ============================================
-- PART 4: Triggers
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_spaces_updated_at ON spaces;
CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_items_updated_at ON canvas_items;
CREATE TRIGGER update_canvas_items_updated_at BEFORE UPDATE ON canvas_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canvas_states_updated_at ON canvas_states;
CREATE TRIGGER update_canvas_states_updated_at BEFORE UPDATE ON canvas_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 5: Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;

-- Since we use Clerk (not Supabase Auth), security is handled at the API layer
-- These policies allow all operations - the API validates user_id before any operation

DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
CREATE POLICY "Allow all operations on projects"
  ON projects FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on spaces" ON spaces;
CREATE POLICY "Allow all operations on spaces"
  ON spaces FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on project_files" ON project_files;
CREATE POLICY "Allow all operations on project_files"
  ON project_files FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on assets" ON assets;
CREATE POLICY "Allow all operations on assets"
  ON assets FOR ALL
  USING (true)
  WITH CHECK (true);

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

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

