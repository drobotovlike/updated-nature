// Project Metadata API
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

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')
  const { method } = req
  const { projectId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const { data: metadata, error } = await supabase
          .from('project_metadata')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        return res.status(200).json(metadata || null)

      case 'POST':
      case 'PUT':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('user_id', userId)
          .single()

        if (!project) {
          return res.status(403).json({ error: 'Project not found or access denied' })
        }

        const metadataData = req.body
        const { data: metadataResult, error: upsertError } = await supabase
          .from('project_metadata')
          .upsert({
            project_id: projectId,
            user_id: userId,
            ...metadataData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id'
          })
          .select()
          .single()

        if (upsertError) throw upsertError
        return res.status(method === 'POST' ? 201 : 200).json(metadataResult)

      case 'DELETE':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('project_metadata')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Metadata deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Metadata API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

