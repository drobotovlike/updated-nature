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

-- Drop existing policies if they exist (in case you're re-running)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role uploads" ON storage.objects;

-- Policy 1: Allow public uploads (for service role key in API)
-- This allows the API to upload files using the service role key
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ature-files');

-- Policy 2: Allow public reads (for public bucket access)
-- This allows anyone to view/download files from the bucket
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ature-files');

-- Policy 3: Allow authenticated users to upload (backup)
-- This is a backup policy in case public uploads don't work
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ature-files');

-- Policy 4: Allow authenticated users to read (backup)
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ature-files');

-- Verify the bucket exists (this will error if bucket doesn't exist, which is helpful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'ature-files'
  ) THEN
    RAISE EXCEPTION 'Bucket "ature-files" does not exist! Please create it in Storage UI first.';
  END IF;
END $$;

