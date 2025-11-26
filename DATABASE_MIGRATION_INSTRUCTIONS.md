# Database Migration Instructions

## How to Update Your Supabase Database Schema

Follow these steps to apply the Tier 1 & Tier 2 database migrations to your Supabase project.

---

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run Migration Script
1. Open the file `database-migrations-tier1-tier2.sql` in your project
2. Copy the **entire contents** of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)

### Step 3: Verify Migration
1. Check the output panel for any errors
2. If successful, you should see messages like:
   - `CREATE TABLE`
   - `CREATE INDEX`
   - `CREATE TRIGGER`
   - etc.

### Step 4: Verify Tables Were Created
1. Go to **Table Editor** in the left sidebar
2. You should see these new tables:
   - `shared_links`
   - `comments`
   - `design_variations`
   - `project_metadata`
   - `asset_tags`
   - `asset_folders`
   - `asset_folder_items`
   - `creation_versions`
   - `room_templates`
   - `team_members`

---

## Method 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd /Users/andrew/furniture-matcher/ature-app

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push

# Or apply the SQL file directly
psql -h your-db-host -U postgres -d postgres -f database-migrations-tier1-tier2.sql
```

---

## Method 3: Using psql Command Line

If you have direct database access:

```bash
# Get your connection string from Supabase Dashboard
# Settings > Database > Connection string > URI

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f database-migrations-tier1-tier2.sql
```

---

## What the Migration Does

The migration script will:

1. **Create 10 new tables:**
   - `shared_links` - For client sharing
   - `comments` - For comments on shared links
   - `design_variations` - For multiple design variations
   - `project_metadata` - For project documentation
   - `asset_tags` - For asset tagging
   - `asset_folders` - For asset organization
   - `asset_folder_items` - Asset-folder relationships
   - `creation_versions` - For version history
   - `room_templates` - For room templates library
   - `team_members` - For team collaboration

2. **Update existing tables:**
   - Add metadata fields to `assets` table
   - Add sharing fields to `projects` table

3. **Create indexes** for better query performance

4. **Set up triggers** for automatic `updated_at` timestamps

5. **Configure RLS policies** (Row Level Security)

---

## Troubleshooting

### Error: "relation already exists"
- This means some tables already exist
- The script uses `CREATE TABLE IF NOT EXISTS`, so it should be safe
- If you get this error, the table might have been partially created
- Check which tables exist and manually drop them if needed:
  ```sql
  DROP TABLE IF EXISTS shared_links CASCADE;
  -- Repeat for other tables if needed
  ```

### Error: "permission denied"
- Make sure you're using the correct database user
- In Supabase Dashboard, you should have full permissions
- If using CLI, ensure you're authenticated

### Error: "extension uuid-ossp does not exist"
- This is rare in Supabase, but if it happens:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```

### Error: "column already exists"
- This means some columns were already added
- The script uses `ADD COLUMN IF NOT EXISTS`, so it should be safe
- If you get this error, you can ignore it or manually check the table structure

---

## Verification Checklist

After running the migration, verify:

- [ ] All 10 new tables exist in Table Editor
- [ ] `assets` table has new columns (width, height, depth, etc.)
- [ ] `projects` table has new columns (is_public, share_token)
- [ ] Indexes are created (check in Table Editor > Indexes)
- [ ] No errors in SQL Editor output

---

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop new tables (in reverse order of dependencies)
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS room_templates CASCADE;
DROP TABLE IF EXISTS creation_versions CASCADE;
DROP TABLE IF EXISTS asset_folder_items CASCADE;
DROP TABLE IF EXISTS asset_folders CASCADE;
DROP TABLE IF EXISTS asset_tags CASCADE;
DROP TABLE IF EXISTS project_metadata CASCADE;
DROP TABLE IF EXISTS design_variations CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS shared_links CASCADE;

-- Remove columns from existing tables
ALTER TABLE projects DROP COLUMN IF EXISTS is_public;
ALTER TABLE projects DROP COLUMN IF EXISTS share_token;

ALTER TABLE assets DROP COLUMN IF EXISTS width;
ALTER TABLE assets DROP COLUMN IF EXISTS height;
ALTER TABLE assets DROP COLUMN IF EXISTS depth;
ALTER TABLE assets DROP COLUMN IF EXISTS unit;
ALTER TABLE assets DROP COLUMN IF EXISTS price;
ALTER TABLE assets DROP COLUMN IF EXISTS vendor;
ALTER TABLE assets DROP COLUMN IF EXISTS sku;
ALTER TABLE assets DROP COLUMN IF EXISTS color;
ALTER TABLE assets DROP COLUMN IF EXISTS style;
```

---

## Quick Start

**Fastest way to apply migrations:**

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy entire `database-migrations-tier1-tier2.sql` file
5. Paste and click **Run**
6. Done! ✅

---

## Need Help?

If you encounter any issues:

1. Check the error message in Supabase SQL Editor
2. Verify your Supabase project is active
3. Ensure you have the correct permissions
4. Check that the base schema (`database-schema.sql`) was already applied

---

**After migration is complete, all Tier 1 features will be ready to use!** 🎉

