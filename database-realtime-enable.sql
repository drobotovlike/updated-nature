-- Enable Supabase Realtime for Canvas Collaboration
-- This migration enables real-time subscriptions on canvas_items table
-- Run this in your Supabase SQL Editor

-- Enable Realtime for canvas_items table
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_items;

-- Optional: Enable Realtime for canvas_state table (for camera sync)
-- Uncomment if you want real-time camera position sync
-- ALTER PUBLICATION supabase_realtime ADD TABLE canvas_state;

-- Verify Realtime is enabled
-- You can check this in Supabase Dashboard → Database → Replication

-- Note: Realtime requires Row Level Security (RLS) to be enabled
-- Make sure your canvas_items table has proper RLS policies
-- See database-canvas-migration.sql for RLS policies

