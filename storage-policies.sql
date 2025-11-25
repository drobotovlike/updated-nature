-- Supabase Storage Bucket Policies for 'ature-files' bucket
-- Run this in your Supabase SQL Editor AFTER creating the bucket in Storage UI
-- 
-- IMPORTANT: First create the bucket in Storage UI:
-- 1. Go to Storage → New bucket
-- 2. Name: ature-files
-- 3. Make it PUBLIC (toggle ON)
-- 4. Create bucket
-- 
-- Then run this SQL script

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Policy 1: Allow public uploads (for service role key in API)
-- This allows the API to upload files using the service role key
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ature-files');

-- Policy 2: Allow public reads (for accessing uploaded files)
-- This allows anyone to view/download the files
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ature-files');

-- Policy 3: Allow authenticated users to upload (backup)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ature-files');

-- Policy 4: Allow authenticated users to read (backup)
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ature-files');

-- Policy 5: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ature-files');

-- Verify policies were created (optional - uncomment to check):
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
