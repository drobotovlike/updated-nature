// Client Sharing & Collaboration API
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { optionalAuth, verifyClerkToken } from '../utils/auth.js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Generate unique share token
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex')
}

async function handler(req, res, userId) {
  // userId may be null for public shared links, but verified if provided
  const { method } = req
  const { token, projectId, linkId, action } = req.query

  // Handle comments
  if (action === 'comments') {
    const { commentId } = req.query
    try {
      switch (method) {
        case 'GET':
          if (!token) {
            return res.status(400).json({ error: 'Link token is required' })
          }

          const { data: link } = await supabase
            .from('shared_links')
            .select('id, access_type')
            .eq('token', token)
            .single()

          if (!link) {
            return res.status(404).json({ error: 'Shared link not found' })
          }

          const { data: comments, error } = await supabase
            .from('comments')
            .select('*')
            .eq('shared_link_id', link.id)
            .order('created_at', { ascending: true })

          if (error) throw error
          return res.status(200).json({ comments })

        case 'POST':
          const { content, xPosition, yPosition, userName, userEmail, parentId } = req.body

          if (!token || !content) {
            return res.status(400).json({ error: 'Link token and content are required' })
          }

          const { data: linkData } = await supabase
            .from('shared_links')
            .select('id, access_type')
            .eq('token', token)
            .single()

          if (!linkData) {
            return res.status(404).json({ error: 'Shared link not found' })
          }

          if (!['comment', 'edit'].includes(linkData.access_type)) {
            return res.status(403).json({ error: 'Comments not allowed on this link' })
          }

          // userId is already verified from optionalAuth middleware (may be null for anonymous comments)

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

  // For public access (token-based), no auth required
  if (method === 'GET' && token) {
    try {
      const { data: link, error } = await supabase
        .from('shared_links')
        .select(`
          *,
          projects:project_id (
            id,
            name,
            workflow,
            project_metadata (*)
          )
        `)
        .eq('token', token)
        .single()

      if (error || !link) {
        return res.status(404).json({ error: 'Shared link not found' })
      }

      // Check expiration
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Link has expired' })
      }

      // Update view count
      await supabase
        .from('shared_links')
        .update({ 
          view_count: link.view_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', link.id)

      return res.status(200).json(link)
    } catch (error) {
      console.error('Sharing API Error:', error)
      return res.status(500).json({ error: 'Internal server error', details: error.message })
    }
  }

  // For other operations, require authentication
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // userId is already verified from optionalAuth middleware

  try {
    switch (method) {
      case 'GET':
        if (linkId) {
          // Get link details (owner only)
          const { data: link, error } = await supabase
            .from('shared_links')
            .select('*, comments(*)')
            .eq('id', linkId)
            .eq('user_id', userId)
            .single()

          if (error) throw error
          return res.status(200).json(link)
        } else {
          // Get all shared links for user
          const { data: links, error } = await supabase
            .from('shared_links')
            .select('*, projects:project_id (id, name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (error) throw error
          return res.status(200).json({ links })
        }

      case 'POST':
        // Create new share link
        const { projectId: newProjectId, creationId, accessType, expiresAt, password } = req.body

        if (!newProjectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        // Verify project ownership
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('id', newProjectId)
          .eq('user_id', userId)
          .single()

        if (!project) {
          return res.status(403).json({ error: 'Project not found or access denied' })
        }

        const shareToken = generateShareToken()
        let passwordHash = null
        if (password) {
          passwordHash = crypto.createHash('sha256').update(password).digest('hex')
        }

        const { data: newLink, error: insertError } = await supabase
          .from('shared_links')
          .insert({
            project_id: newProjectId,
            creation_id: creationId || null,
            user_id: userId,
            token: shareToken,
            access_type: accessType || 'view',
            expires_at: expiresAt || null,
            password_hash: passwordHash,
          })
          .select()
          .single()

        if (insertError) throw insertError

        return res.status(201).json(newLink)

      case 'PUT':
        // Update share link settings
        if (!linkId) {
          return res.status(400).json({ error: 'Link ID is required' })
        }

        const updates = req.body
        const { data: updatedLink, error: updateError } = await supabase
          .from('shared_links')
          .update(updates)
          .eq('id', linkId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json(updatedLink)

      case 'DELETE':
        // Delete share link
        if (!linkId) {
          return res.status(400).json({ error: 'Link ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('shared_links')
          .delete()
          .eq('id', linkId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Link deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Sharing API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

// Export with optional authentication (public links don't require auth, but creation/management does)
export default optionalAuth(handler)

