// Asset Tags API
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
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
  const { assetId, tag } = req.query

  try {
    switch (method) {
      case 'GET':
        if (assetId) {
          const { data: tags, error } = await supabase
            .from('asset_tags')
            .select('tag')
            .eq('asset_id', assetId)

          if (error) throw error
          return res.status(200).json({ tags: tags.map(t => t.tag) })
        } else {
          const { data: tags, error } = await supabase
            .from('asset_tags')
            .select('tag')
            .in('asset_id', 
              supabase
                .from('assets')
                .select('id')
                .eq('user_id', userId)
            )

          if (error) throw error
          const uniqueTags = [...new Set(tags.map(t => t.tag))]
          return res.status(200).json({ tags: uniqueTags })
        }

      case 'POST':
        const { assetId: newAssetId, tag: newTag } = req.body

        if (!newAssetId || !newTag) {
          return res.status(400).json({ error: 'Asset ID and tag are required' })
        }

        const { data: asset } = await supabase
          .from('assets')
          .select('id')
          .eq('id', newAssetId)
          .eq('user_id', userId)
          .single()

        if (!asset) {
          return res.status(403).json({ error: 'Asset not found or access denied' })
        }

        const { data: newTagData, error: insertError } = await supabase
          .from('asset_tags')
          .insert({
            asset_id: newAssetId,
            tag: newTag.toLowerCase().trim(),
          })
          .select()
          .single()

        if (insertError) {
          if (insertError.code === '23505') {
            return res.status(200).json({ message: 'Tag already exists' })
          }
          throw insertError
        }

        return res.status(201).json(newTagData)

      case 'DELETE':
        if (!assetId || !tag) {
          return res.status(400).json({ error: 'Asset ID and tag are required' })
        }

        const { error: deleteError } = await supabase
          .from('asset_tags')
          .delete()
          .eq('asset_id', assetId)
          .eq('tag', tag)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Tag removed' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Asset Tags API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

