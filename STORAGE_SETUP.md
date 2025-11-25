# Supabase Storage Setup Guide

## Step 1: Create the Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name**: `ature-files`
   - **Public bucket**: Toggle **ON** (this allows public read access)
   - **File size limit**: Leave default or set to your preference
   - **Allowed MIME types**: Leave empty (allows all types) or specify: `image/*,video/*,application/pdf`
6. Click **Create bucket**

## Step 2: Configure Storage Policies

After creating the bucket, run the SQL policies:

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy and paste the contents of `storage-policies.sql`
3. Click **Run**

This will create policies that allow:
- Public uploads (for service role key)
- Public reads (for public bucket access)
- Authenticated uploads (backup)

## Step 3: Verify Setup

1. Check that the bucket `ature-files` exists in Storage
2. Verify it's marked as **Public**
3. Test by uploading a file through your app

## Alternative: Manual Policy Setup

If you prefer to set up policies manually in the Storage UI:

1. Go to **Storage** → **Policies**
2. Select the `ature-files` bucket
3. Click **New Policy**
4. Create these policies:

**Policy 1: Allow Public Uploads**
- Policy name: `Allow public uploads`
- Allowed operation: `INSERT`
- Target roles: `public`
- USING expression: `bucket_id = 'ature-files'`
- WITH CHECK expression: `bucket_id = 'ature-files'`

**Policy 2: Allow Public Reads**
- Policy name: `Allow public reads`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `bucket_id = 'ature-files'`

## Troubleshooting

**If uploads still fail:**
1. Make sure the bucket is **Public**
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
3. Check that the storage policies SQL was run successfully
4. Look at Supabase Dashboard → Logs for any errors

