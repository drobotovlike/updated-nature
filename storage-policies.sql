-- Supabase Storage Bucket Policies
-- Run this in your Supabase SQL Editor
-- Make sure the 'ature-files' bucket exists first (create it in Storage UI)

-- Option 1: Disable RLS on storage (simplest - works with service role key)
-- This allows the service role key to upload files without RLS blocking
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Option 2: If you prefer to keep RLS enabled, use these policies instead:
-- (Comment out the ALTER TABLE line above and uncomment the policies below)

-- DROP POLICY IF EXISTS "Allow service role uploads" ON storage.objects;
-- CREATE POLICY "Allow service role uploads"
-- ON storage.objects FOR INSERT
-- TO service_role
-- WITH CHECK (bucket_id = 'ature-files');

-- DROP POLICY IF EXISTS "Allow service role reads" ON storage.objects;
-- CREATE POLICY "Allow service role reads"
-- ON storage.objects FOR SELECT
-- TO service_role
-- USING (bucket_id = 'ature-files');

-- DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
-- CREATE POLICY "Allow public reads"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'ature-files');

-- Note: After running this, make sure SUPABASE_SERVICE_ROLE_KEY is set in Vercel environment variables

