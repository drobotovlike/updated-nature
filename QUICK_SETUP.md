# Quick Setup Guide - Supabase Integration

## ✅ Completed

1. ✅ Supabase client installed and configured
2. ✅ Database schema created (`database-schema.sql`)
3. ✅ API endpoints updated to use Supabase
4. ✅ File upload to Supabase Storage configured
5. ✅ Cloud project manager created
6. ✅ Hybrid project manager (cloud + localStorage fallback)
7. ✅ All components updated to use async functions
8. ✅ Clerk authentication UI styling improved

## 🚀 Setup Steps (5 minutes)

### Step 1: Run Database Schema

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ifvqkmpyknfezpxscnef)
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `database-schema.sql`
5. Paste into the editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `ature-files`
4. **Make it Public** (toggle ON)
5. Click **Create bucket**

### Step 3: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables (click **Add** for each):

```
VITE_SUPABASE_URL
https://ifvqkmpyknfezpxscnef.supabase.co
(Select: Production, Preview, Development)

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg
(Select: Production, Preview, Development)

SUPABASE_URL
https://ifvqkmpyknfezpxscnef.supabase.co
(Select: Production, Preview, Development)

SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg
(Select: Production, Preview, Development)
```

5. Click **Save** after each variable

### Step 4: Redeploy

1. In Vercel Dashboard, go to **Deployments**
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 5: Test

1. Open your deployed site
2. Sign in with Clerk
3. Create a new project
4. Upload an image
5. Check Supabase Dashboard → **Table Editor** → `projects` table
6. Check Supabase Dashboard → **Storage** → `ature-files` bucket

## 🎉 What Works Now

- ✅ Projects sync across all devices (iPhone, desktop, etc.)
- ✅ Files stored in cloud (Supabase Storage)
- ✅ Beautiful Clerk authentication UI
- ✅ Offline support (falls back to localStorage)
- ✅ Automatic sync when online

## 🔍 Verify It's Working

1. **Create a project on desktop**
2. **Open the app on iPhone**
3. **Sign in with the same account**
4. **You should see the project!** 🎉

## 🐛 Troubleshooting

**Projects not showing?**
- Check browser console (F12) for errors
- Verify environment variables are set in Vercel
- Check Supabase Dashboard → Logs for errors

**Files not uploading?**
- Verify `ature-files` bucket exists and is public
- Check Supabase Dashboard → Storage → Policies

**Database errors?**
- Make sure you ran `database-schema.sql`
- Check Supabase Dashboard → Table Editor to see if tables exist

## 📝 Next Steps (Optional)

- Add real-time sync with Supabase Realtime
- Add search functionality
- Add templates feature
- Add assets library

