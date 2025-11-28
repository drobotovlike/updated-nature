// Spaces API using Supabase
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../_utils/auth.js'
import { getSupabaseConfig } from '../_utils/env.js'
import { logger } from '../_utils/logger.js'

// Get Supabase configuration
const config = getSupabaseConfig()

// Create Supabase client (may be null if not configured)
const supabase = config.isConfigured 
  ? createClient(config.url, config.serviceKey)
  : null

async function handler(req, res, userId) {
  // Check if Supabase is configured
  if (!supabase) {
    logger.error('Supabase not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in Vercel.',
    })
  }

  // userId is verified and safe to use

  try {
    const { method } = req
    const { spaceId } = req.query

    switch (method) {
      case 'GET':
        let query = supabase
          .from('spaces')
          .select('*')
          .eq('user_id', userId)
          .eq('deleted', false)
          .order('created_at', { ascending: false })

        if (spaceId) {
          query = query.eq('id', spaceId)
        }

        const { data: spaces, error } = await query
        if (error) throw error

        return res.status(200).json({ spaces: spaces || [] })

      case 'POST':
        const { name } = req.body
        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Space name is required' })
        }

        const { data: newSpace, error: insertError } = await supabase
          .from('spaces')
          .insert({
            user_id: userId,
            name: name.trim(),
          })
          .select()
          .single()

        if (insertError) throw insertError
        return res.status(201).json(newSpace)

      case 'PUT':
        if (!spaceId) {
          return res.status(400).json({ error: 'Space ID is required' })
        }

        const updates = req.body
        const { data: updatedSpace, error: updateError } = await supabase
          .from('spaces')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', spaceId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json(updatedSpace)

      case 'DELETE':
        if (!spaceId) {
          return res.status(400).json({ error: 'Space ID is required' })
        }

        const { data: deletedSpace, error: deleteError } = await supabase
          .from('spaces')
          .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
          })
          .eq('id', spaceId)
          .eq('user_id', userId)
          .select()
          .single()

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Space deleted', space: deletedSpace })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Spaces API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

// Export with authentication middleware
export default requireAuth(handler)

