# Canvas Database Setup

The canvas feature requires two database tables that need to be created in Supabase.

## Quick Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `database-canvas-migration-safe.sql`
5. Click **Run**

## What This Creates

- **`canvas_items`** - Stores individual images/elements on the canvas
- **`canvas_states`** - Stores viewport settings (zoom, pan, grid, etc.)

## Verify Tables Exist

After running the migration, verify the tables exist:

1. Go to **Table Editor** in Supabase
2. You should see:
   - `canvas_items`
   - `canvas_states`

## Troubleshooting

**Error: "relation does not exist"**
- The tables haven't been created yet
- Run the migration SQL script

**Error: "permission denied"**
- Check that RLS policies are set correctly
- The migration script includes policy creation

**Canvas loads but doesn't save**
- Check that the tables exist
- Verify environment variables are set in Vercel:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

