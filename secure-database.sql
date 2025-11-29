-- Secure Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor to secure your database
-- This disables public access and relies on the Backend API (using Service Role) for all operations.

-- 1. Enable RLS on all tables (idempotent)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
-- Check if canvas tables exist before enabling RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvas_states') THEN
        ALTER TABLE canvas_states ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvas_items') THEN
        ALTER TABLE canvas_items ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Drop insecure "Allow all" policies
DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
DROP POLICY IF EXISTS "Allow all operations on spaces" ON spaces;
DROP POLICY IF EXISTS "Allow all operations on project_files" ON project_files;
DROP POLICY IF EXISTS "Allow all operations on assets" ON assets;

-- Drop canvas policies if they exist (generic names)
DROP POLICY IF EXISTS "Allow all operations on canvas_states" ON canvas_states;
DROP POLICY IF EXISTS "Allow all operations on canvas_items" ON canvas_items;

-- 3. Create "Deny All" policies for public/anon role
-- The Service Role (used by your API) automatically bypasses RLS, so it will still work.
-- These policies ensure that no one can access the DB directly from the browser using the Anon Key.

CREATE POLICY "Deny public access to projects" ON projects FOR ALL TO public USING (false);
CREATE POLICY "Deny public access to spaces" ON spaces FOR ALL TO public USING (false);
CREATE POLICY "Deny public access to project_files" ON project_files FOR ALL TO public USING (false);
CREATE POLICY "Deny public access to assets" ON assets FOR ALL TO public USING (false);

-- Canvas tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvas_states') THEN
        EXECUTE 'CREATE POLICY "Deny public access to canvas_states" ON canvas_states FOR ALL TO public USING (false)';
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'canvas_items') THEN
        EXECUTE 'CREATE POLICY "Deny public access to canvas_items" ON canvas_items FOR ALL TO public USING (false)';
    END IF;
END $$;

-- 4. Storage Policies (Optional - stricter security)
-- If you want to restrict uploads to only the API (Service Role), run this:
/*
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
-- Keep "Allow public reads" if you want images to be publicly viewable
*/

