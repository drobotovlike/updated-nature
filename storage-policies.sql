-- Supabase Storage Bucket Policies for 'ature-files' bucket
-- Run this in your Supabase SQL Editor
-- Make sure the 'ature-files' bucket exists first (create it in Storage UI)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

-- Allow anyone to upload files (since we're using service role key in API)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'ature-files');

-- Allow anyone to read files (public bucket)
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ature-files');

-- Allow authenticated users to upload (backup)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ature-files');

-- Allow authenticated users to read (backup)
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ature-files');

