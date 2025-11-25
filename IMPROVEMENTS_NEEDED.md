# Website Improvements & Missing Features

## Critical Issues Fixed ✅

### 1. Cloud Storage & Cross-Device Sync
**Status:** API Created, Integration Needed

**What was done:**
- Created `/api/projects/index.js` - Cloud storage API for projects
- Created `/api/files/upload.js` - File upload API
- Created `cloudProjectManager.js` - Cloud-based project management utility

**What needs to be done:**
1. **Choose a database:**
   - Option A: Vercel Postgres (recommended for Vercel)
   - Option B: Supabase (free tier, easy setup)
   - Option C: MongoDB Atlas (scalable)
   - Option D: Firebase Firestore (Google ecosystem)

2. **Choose file storage:**
   - Option A: Cloudinary (best for images, free tier)
   - Option B: AWS S3 (scalable, pay-per-use)
   - Option C: Vercel Blob Storage (integrated with Vercel)
   - Option D: Supabase Storage (if using Supabase)

3. **Update projectManager.js:**
   - Replace localStorage calls with cloud API calls
   - Add sync functionality
   - Handle offline mode with localStorage fallback

4. **Add Clerk Secret Key:**
   - Set `CLERK_SECRET_KEY` in Vercel environment variables
   - Get from Clerk Dashboard → API Keys

### 2. Clerk Authentication UI Styling
**Status:** ✅ Improved

**What was done:**
- Enhanced SignIn and SignUp page styling
- Matched website's stone color scheme
- Improved typography (Manrope font, serif headers)
- Better button styles, inputs, and spacing
- Added proper focus states and transitions

## Missing Features & Components

### High Priority

1. **Database Integration**
   - [ ] Set up database (Postgres/Supabase/MongoDB)
   - [ ] Create projects table/schema
   - [ ] Create spaces table/schema
   - [ ] Implement database queries in API

2. **File Storage Integration**
   - [ ] Set up cloud storage (Cloudinary/S3)
   - [ ] Implement file upload in `/api/files/upload.js`
   - [ ] Update projectManager to use cloud URLs
   - [ ] Handle file deletion

3. **Real-time Sync**
   - [ ] Add WebSocket or polling for real-time updates
   - [ ] Sync projects when user logs in on new device
   - [ ] Handle conflicts (last-write-wins or merge)

4. **Search Functionality**
   - [ ] Implement search in DashboardPage
   - [ ] Search projects by name
   - [ ] Filter by date, space, etc.

### Medium Priority

5. **Templates Feature**
   - [ ] Create templates database/collection
   - [ ] Template gallery UI
   - [ ] Apply template to project

6. **Assets Library**
   - [ ] Create assets storage
   - [ ] Asset browser UI
   - [ ] Upload/manage assets
   - [ ] Search and filter assets

7. **Image Optimization**
   - [ ] Compress images before upload
   - [ ] Generate thumbnails
   - [ ] Lazy loading for project images

8. **Error Handling**
   - [ ] Better error messages
   - [ ] Retry logic for failed API calls
   - [ ] Offline mode indicators

9. **Loading States**
   - [ ] Skeleton loaders
   - [ ] Progress indicators for uploads
   - [ ] Optimistic UI updates

### Low Priority

10. **Analytics**
    - [ ] Track project creation
    - [ ] Track feature usage
    - [ ] User engagement metrics

11. **Notifications**
    - [ ] Project save confirmations
    - [ ] Sync status notifications
    - [ ] Error notifications

12. **Export Options**
    - [ ] Export to PDF
    - [ ] Export to different formats
    - [ ] Batch export

## Implementation Steps

### Step 1: Set Up Database (Choose One)

**Option A: Supabase (Recommended for Quick Start)**
```bash
# 1. Create account at supabase.com
# 2. Create new project
# 3. Get connection string
# 4. Add to Vercel env: SUPABASE_URL, SUPABASE_KEY
# 5. Install: npm install @supabase/supabase-js
```

**Option B: Vercel Postgres**
```bash
# 1. In Vercel Dashboard → Storage → Create Postgres
# 2. Get connection string
# 3. Install: npm install @vercel/postgres
```

### Step 2: Set Up File Storage (Choose One)

**Option A: Cloudinary (Recommended)**
```bash
# 1. Create account at cloudinary.com
# 2. Get API keys
# 3. Add to Vercel env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# 4. Install: npm install cloudinary
```

**Option B: Vercel Blob**
```bash
# 1. In Vercel Dashboard → Storage → Create Blob
# 2. Install: npm install @vercel/blob
```

### Step 3: Update API Endpoints

1. Update `/api/projects/index.js` with database queries
2. Update `/api/files/upload.js` with cloud storage
3. Add Clerk secret key verification

### Step 4: Update Frontend

1. Update `projectManager.js` to use cloud API
2. Add sync on login
3. Add offline support
4. Update all components to use new API

## Environment Variables Needed

Add these to Vercel:

```
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (choose one)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
# OR
POSTGRES_URL=postgresql://...

# File Storage (choose one)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
# OR
BLOB_READ_WRITE_TOKEN=xxx

# Gemini (already set)
GEMINI_API_KEY=xxx
```

## Next Steps

1. **Immediate:** Set up database and file storage
2. **Short-term:** Integrate cloud APIs into projectManager
3. **Medium-term:** Add real-time sync
4. **Long-term:** Add templates, assets library, search

