// Spaces API using Supabase
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../utils/auth.js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function handler(req, res, userId) {
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

