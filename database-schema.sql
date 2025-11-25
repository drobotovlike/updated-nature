-- Supabase Database Schema for ATURE Studio
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
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

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_space_id ON projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted);
CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_spaces_deleted ON spaces(deleted);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Projects policies: Users can only access their own projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

-- Spaces policies: Users can only access their own spaces
CREATE POLICY "Users can view their own spaces"
  ON spaces FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert their own spaces"
  ON spaces FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update their own spaces"
  ON spaces FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own spaces"
  ON spaces FOR DELETE
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

-- Project files policies
CREATE POLICY "Users can view their own project files"
  ON project_files FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert their own project files"
  ON project_files FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can delete their own project files"
  ON project_files FOR DELETE
  USING (auth.uid()::text = user_id OR user_id = current_setting('app.user_id', true));

