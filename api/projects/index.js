// Cloud Storage API for Projects using Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdnFrbXB5a25mZXpweHNjbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzk5NjksImV4cCI6MjA3OTYxNTk2OX0._0c2EwgFodZOdBRj2ejlZBhdclMt_OOlAG0XprNNsFg'

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get user ID from Authorization header (Clerk user ID)
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing token' })
  }

  const userId = authHeader.replace('Bearer ', '')

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - Invalid user ID' })
  }

  try {
    const { method } = req
    const { projectId, spaceId } = req.query

    switch (method) {
      case 'GET':
        if (projectId) {
          // Get single project
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .eq('user_id', userId)
            .eq('deleted', false)
            .single()

          if (projectError) {
            if (projectError.code === 'PGRST116') {
              return res.status(404).json({ error: 'Project not found' })
            }
            throw projectError
          }

          return res.status(200).json(project)
        } else {
          // Get all projects (optionally filtered by spaceId)
          let query = supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .eq('deleted', false)
            .order('updated_at', { ascending: false })

          if (spaceId) {
            query = query.eq('space_id', spaceId)
          }

          const { data: projects, error: projectsError } = await query

          if (projectsError) throw projectsError

          return res.status(200).json({ projects: projects || [] })
        }

      case 'POST':
        // Create new project
        const { name, workflow, spaceId: newSpaceId } = req.body

        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Project name is required' })
        }

        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            name: name.trim(),
            space_id: newSpaceId || null,
            workflow: workflow || {},
          })
          .select()
          .single()

        if (insertError) throw insertError

        return res.status(201).json(newProject)

      case 'PUT':
        // Update project
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const updates = req.body
        const { data: updatedProject, error: updateError } = await supabase
          .from('projects')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) {
          if (updateError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Project not found' })
          }
          throw updateError
        }

        return res.status(200).json(updatedProject)

      case 'DELETE':
        // Soft delete project
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const { data: deletedProject, error: deleteError } = await supabase
          .from('projects')
          .update({
            deleted: true,
            deleted_at: new Date().toISOString(),
          })
          .eq('id', projectId)
          .eq('user_id', userId)
          .select()
          .single()

        if (deleteError) {
          if (deleteError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Project not found' })
          }
          throw deleteError
        }

        return res.status(200).json({ message: 'Project deleted', project: deletedProject })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      code: error.code 
    })
  }
}
