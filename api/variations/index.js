// Design Variations API
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
  const { projectId, variationId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (variationId) {
          const { data: variation, error } = await supabase
            .from('design_variations')
            .select('*')
            .eq('id', variationId)
            .eq('user_id', userId)
            .single()

          if (error) throw error
          return res.status(200).json(variation)
        } else if (projectId) {
          const { data: variations, error } = await supabase
            .from('design_variations')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (error) throw error
          return res.status(200).json({ variations })
        } else {
          return res.status(400).json({ error: 'Project ID or Variation ID required' })
        }

      case 'POST':
        const { variations } = req.body

        if (!variations || !Array.isArray(variations)) {
          return res.status(400).json({ error: 'Variations array is required' })
        }

        const projectIdToCheck = variations[0]?.project_id
        if (projectIdToCheck) {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectIdToCheck)
            .eq('user_id', userId)
            .single()

          if (!project) {
            return res.status(403).json({ error: 'Project not found or access denied' })
          }
        }

        const variationsToInsert = variations.map(v => ({
          ...v,
          user_id: userId,
        }))

        const { data: newVariations, error: insertError } = await supabase
          .from('design_variations')
          .insert(variationsToInsert)
          .select()

        if (insertError) throw insertError
        return res.status(201).json({ variations: newVariations })

      case 'PUT':
        if (!variationId) {
          return res.status(400).json({ error: 'Variation ID is required' })
        }

        const updates = req.body
        const { data: updatedVariation, error: updateError } = await supabase
          .from('design_variations')
          .update(updates)
          .eq('id', variationId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError

        if (updates.is_selected) {
          await supabase
            .from('design_variations')
            .update({ is_selected: false })
            .eq('project_id', updatedVariation.project_id)
            .neq('id', variationId)
        }

        return res.status(200).json(updatedVariation)

      case 'DELETE':
        if (!variationId) {
          return res.status(400).json({ error: 'Variation ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('design_variations')
          .delete()
          .eq('id', variationId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Variation deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Variations API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

