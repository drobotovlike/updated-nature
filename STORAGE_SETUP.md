# Supabase Storage Setup Guide

## Step 1: Create the Storage Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name**: `ature-files`
   - **Public bucket**: Toggle **ON** (this allows public read access)
   - **File size limit**: Leave default or set to your preference (e.g., 10MB)
   - **Allowed MIME types**: Leave empty for all types, or specify: `image/*,application/json`
6. Click **Create bucket**

## Step 2: Set Up Storage Policies

After creating the bucket, run the SQL script in `storage-policies.sql`:

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Copy and paste the contents of `storage-policies.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)

This will create policies that allow:
- Public uploads (for service role key)
- Public reads (for accessing files)
- Authenticated uploads (backup)

## Step 3: Verify Configuration

1. Check that the bucket exists in **Storage** → **Buckets**
2. Verify it's marked as **Public**
3. Test by uploading a file through your app

## Troubleshooting

**If uploads still fail:**
- Make sure the bucket is **Public**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
- Check that the storage policies were created successfully
- Look at Supabase Dashboard → Logs for any errors

**Storage policies not working?**
- Try making the bucket public in the UI (simpler solution)
- Or ensure the service role key is being used (not anon key)
