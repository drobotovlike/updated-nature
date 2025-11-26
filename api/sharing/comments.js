// Comments API for Shared Links
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method } = req
  const { linkToken, commentId } = req.query

  try {
    switch (method) {
      case 'GET':
        // Get comments for a shared link
        if (!linkToken) {
          return res.status(400).json({ error: 'Link token is required' })
        }

        // Get link to verify access
        const { data: link } = await supabase
          .from('shared_links')
          .select('id, access_type')
          .eq('token', linkToken)
          .single()

        if (!link) {
          return res.status(404).json({ error: 'Shared link not found' })
        }

        // Get comments
        const { data: comments, error } = await supabase
          .from('comments')
          .select('*')
          .eq('shared_link_id', link.id)
          .order('created_at', { ascending: true })

        if (error) throw error
        return res.status(200).json({ comments })

      case 'POST':
        // Add comment
        const { content, xPosition, yPosition, userName, userEmail, parentId } = req.body

        if (!linkToken || !content) {
          return res.status(400).json({ error: 'Link token and content are required' })
        }

        // Get link
        const { data: linkData } = await supabase
          .from('shared_links')
          .select('id, access_type')
          .eq('token', linkToken)
          .single()

        if (!linkData) {
          return res.status(404).json({ error: 'Shared link not found' })
        }

        // Check if comments allowed
        if (!['comment', 'edit'].includes(linkData.access_type)) {
          return res.status(403).json({ error: 'Comments not allowed on this link' })
        }

        // Get user ID if authenticated
        const authHeader = req.headers.authorization
        let userId = null
        if (authHeader && authHeader.startsWith('Bearer ')) {
          userId = authHeader.replace('Bearer ', '')
        }

        const { data: newComment, error: insertError } = await supabase
          .from('comments')
          .insert({
            shared_link_id: linkData.id,
            user_id: userId,
            user_name: userName || null,
            user_email: userEmail || null,
            content,
            x_position: xPosition || null,
            y_position: yPosition || null,
            parent_id: parentId || null,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return res.status(201).json(newComment)

      case 'PUT':
        // Update comment (resolve, edit)
        if (!commentId) {
          return res.status(400).json({ error: 'Comment ID is required' })
        }

        const updates = req.body
        const { data: updatedComment, error: updateError } = await supabase
          .from('comments')
          .update(updates)
          .eq('id', commentId)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json(updatedComment)

      case 'DELETE':
        // Delete comment
        if (!commentId) {
          return res.status(400).json({ error: 'Comment ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Comment deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Comments API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

