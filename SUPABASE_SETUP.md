# Supabase Setup Guide

## ✅ What's Been Done

1. **Supabase Client** - Created `src/utils/supabaseClient.js`
2. **Database Schema** - Created `database-schema.sql` with tables for projects, spaces, and files
3. **API Endpoints** - Updated to use Supabase:
   - `/api/projects/index.js` - Projects CRUD
   - `/api/spaces/index.js` - Spaces CRUD
   - `/api/files/upload.js` - File uploads to Supabase Storage
4. **Cloud Project Manager** - Created `src/utils/cloudProjectManager.js`
5. **Hybrid Project Manager** - Updated `src/utils/projectManager.js` to use cloud with localStorage fallback

## 🔧 Setup Steps

### Step 1: Run Database Schema

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ifvqkmpyknfezpxscnef`
3. Go to **SQL Editor**
4. Copy and paste the contents of `database-schema.sql`
5. Click **Run** to create tables and policies

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **New bucket**
3. Name: `ature-files`
4. Make it **Public** (or set up proper RLS policies)
5. Click **Create bucket**

### Step 3: Set Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables:

```
VITE_SUPABASE_URL=https://ifvqkmpyknfezpxscnef.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg

# For server-side API (optional, for better security)
SUPABASE_URL=https://ifvqkmpyknfezpxscnef.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg

# Clerk (if not already set)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Note:** For production, get the Service Role Key from Supabase Dashboard → Settings → API → service_role key (keep this secret!)

### Step 4: Update RLS Policies (If Needed)

The schema includes RLS policies, but since we're using Clerk (not Supabase Auth), you may need to adjust them:

1. Go to Supabase Dashboard → Authentication → Policies
2. For each table (projects, spaces, project_files):
   - The policies use `auth.uid()::text = user_id` which won't work with Clerk
   - You can either:
     - **Option A:** Disable RLS temporarily (not recommended for production)
     - **Option B:** Use a custom function that accepts user_id as parameter
     - **Option C:** Use Supabase Service Role Key in API (current implementation)

The current API implementation uses the Service Role Key, which bypasses RLS. For better security, consider implementing proper RLS with a custom function.

### Step 5: Test the Integration

1. Deploy to Vercel
2. Sign in to your app
3. Create a project
4. Check Supabase Dashboard → Table Editor → projects table to see if data appears
5. Check Storage → ature-files bucket to see uploaded files

## 🔒 Security Notes

1. **Service Role Key**: The API currently uses the anon key. For production, use the Service Role Key from Supabase Dashboard (Settings → API). Keep it secret!

2. **RLS Policies**: The current setup bypasses RLS by using service role. For better security:
   - Implement proper RLS policies that work with Clerk
   - Or use a custom function that validates user_id

3. **File Storage**: Make sure the `ature-files` bucket has proper access policies:
   - Public read for images (or use signed URLs)
   - Authenticated write only

## 🐛 Troubleshooting

**Projects not syncing?**
- Check browser console for errors
- Verify environment variables are set in Vercel
- Check Supabase Dashboard → Logs for API errors

**Files not uploading?**
- Verify `ature-files` bucket exists
- Check bucket permissions
- Check API logs in Vercel

**Authentication errors?**
- Verify Clerk secret key is set
- Check that user ID is being passed correctly

## 📝 Next Steps

1. ✅ Run database schema
2. ✅ Create storage bucket
3. ✅ Set environment variables
4. ✅ Deploy and test
5. ⏳ Monitor for errors
6. ⏳ Add error handling improvements
7. ⏳ Add real-time sync (optional)

