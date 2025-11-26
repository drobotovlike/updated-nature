-- ATURE Studio - Database Migrations for Tier 1 & Tier 2 Features
-- Run this in your Supabase SQL Editor after the base schema

-- ============================================
-- TIER 1 FEATURES - DATABASE TABLES
-- ============================================

-- 1. Shared Links - Client Sharing & Collaboration
CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  creation_id UUID,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  access_type TEXT DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  password_hash TEXT,
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_project_id ON shared_links(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id);

-- 2. Comments - Comments on Shared Links
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_link_id UUID REFERENCES shared_links(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  content TEXT NOT NULL,
  x_position FLOAT,
  y_position FLOAT,
  resolved BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_shared_link_id ON comments(shared_link_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- 3. Design Variations - Multiple Design Variations
CREATE TABLE IF NOT EXISTS design_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT,
  prompt TEXT,
  room_file_url TEXT,
  asset_file_url TEXT,
  result_url TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  generation_params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_variations_project_id ON design_variations(project_id);
CREATE INDEX IF NOT EXISTS idx_design_variations_user_id ON design_variations(user_id);
CREATE INDEX IF NOT EXISTS idx_design_variations_is_selected ON design_variations(is_selected);

-- 4. Project Metadata - Project Documentation
CREATE TABLE IF NOT EXISTS project_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  room_type TEXT,
  room_measurements JSONB,
  budget DECIMAL(10, 2),
  deadline DATE,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_metadata_project_id ON project_metadata(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metadata_user_id ON project_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_project_metadata_tags ON project_metadata USING GIN(tags);

-- 5. Asset Tags - Enhanced Asset Library
CREATE TABLE IF NOT EXISTS asset_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_asset_tags_asset_id ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_tag ON asset_tags(tag);

-- 6. Asset Folders - Asset Organization
CREATE TABLE IF NOT EXISTS asset_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_folders_user_id ON asset_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_folders_parent_id ON asset_folders(parent_id);

-- 7. Asset Folder Items - Asset-Folder Relationship
CREATE TABLE IF NOT EXISTS asset_folder_items (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (asset_id, folder_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_folder_items_asset_id ON asset_folder_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_folder_items_folder_id ON asset_folder_items(folder_id);

-- ============================================
-- TIER 2 FEATURES - DATABASE TABLES
-- ============================================

-- 8. Creation Versions - Version History
CREATE TABLE IF NOT EXISTS creation_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES design_variations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  result_url TEXT NOT NULL,
  prompt TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, variation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_creation_versions_project_id ON creation_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_creation_versions_variation_id ON creation_versions(variation_id);

-- 9. Room Templates - Room Templates Library
CREATE TABLE IF NOT EXISTS room_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL,
  style TEXT,
  preview_url TEXT,
  room_image_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_by TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_templates_room_type ON room_templates(room_type);
CREATE INDEX IF NOT EXISTS idx_room_templates_style ON room_templates(style);
CREATE INDEX IF NOT EXISTS idx_room_templates_is_public ON room_templates(is_public);

-- 10. Team Members - Team Collaboration
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  invited_by TEXT NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Add metadata fields to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS width DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS height DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depth DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'cm';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS style TEXT;

-- Add sharing fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_shared_links_updated_at ON shared_links;
CREATE TRIGGER update_shared_links_updated_at BEFORE UPDATE ON shared_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_variations_updated_at ON design_variations;
CREATE TRIGGER update_design_variations_updated_at BEFORE UPDATE ON design_variations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_metadata_updated_at ON project_metadata;
CREATE TRIGGER update_project_metadata_updated_at BEFORE UPDATE ON project_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_asset_folders_updated_at ON asset_folders;
CREATE TRIGGER update_asset_folders_updated_at BEFORE UPDATE ON asset_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_room_templates_updated_at ON room_templates;
CREATE TRIGGER update_room_templates_updated_at BEFORE UPDATE ON room_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on new tables
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE creation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all - security handled at API level)
DROP POLICY IF EXISTS "Allow all operations on shared_links" ON shared_links;
CREATE POLICY "Allow all operations on shared_links"
  ON shared_links FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on comments" ON comments;
CREATE POLICY "Allow all operations on comments"
  ON comments FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on design_variations" ON design_variations;
CREATE POLICY "Allow all operations on design_variations"
  ON design_variations FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on project_metadata" ON project_metadata;
CREATE POLICY "Allow all operations on project_metadata"
  ON project_metadata FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on asset_tags" ON asset_tags;
CREATE POLICY "Allow all operations on asset_tags"
  ON asset_tags FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on asset_folders" ON asset_folders;
CREATE POLICY "Allow all operations on asset_folders"
  ON asset_folders FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on asset_folder_items" ON asset_folder_items;
CREATE POLICY "Allow all operations on asset_folder_items"
  ON asset_folder_items FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on creation_versions" ON creation_versions;
CREATE POLICY "Allow all operations on creation_versions"
  ON creation_versions FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on room_templates" ON room_templates;
CREATE POLICY "Allow all operations on room_templates"
  ON room_templates FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on team_members" ON team_members;
CREATE POLICY "Allow all operations on team_members"
  ON team_members FOR ALL
  USING (true)
  WITH CHECK (true);

