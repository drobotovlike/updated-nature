-- Supabase Storage Bucket Policies
-- Run this in your Supabase SQL Editor after creating the 'ature-files' bucket

-- First, ensure the bucket exists (create it in Storage UI if it doesn't exist)
-- Then run these policies

-- Allow authenticated users (via service role) to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ature-files');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ature-files');

-- Allow public reads (if bucket is public)
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ature-files');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ature-files');

-- Alternative: If using service role key, you can disable RLS on storage
-- (Not recommended for production, but works for development)
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Note: The service role key should bypass RLS, but if you're still getting errors,
-- you may need to:
-- 1. Make the bucket public in Storage UI
-- 2. Or ensure SUPABASE_SERVICE_ROLE_KEY is set correctly in Vercel environment variables

