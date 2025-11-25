import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get user ID from Authorization header (Clerk user ID)
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Missing or invalid authorization header' })
  }

  const userId = authHeader.replace('Bearer ', '')
  if (!userId || userId === 'undefined') {
    return res.status(401).json({ error: 'Unauthorized - Invalid user ID' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    const { method } = req
    const { assetId } = req.query

    switch (method) {
      case 'GET':
        if (assetId) {
          // Get single asset
          const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select('*')
            .eq('id', assetId)
            .single()

          if (assetError) {
            if (assetError.code === 'PGRST116') {
              return res.status(404).json({ error: 'Asset not found' })
            }
            throw assetError
          }

          return res.status(200).json(asset)
        } else {
          // Get all assets (shared library - all users)
          const { data: assets, error: assetsError } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false })

          if (assetsError) throw assetsError

          return res.status(200).json({ assets: assets || [] })
        }

      case 'POST':
        // Add asset to shared library
        const { name, url, type = 'image', description } = req.body

        if (!name || !url) {
          return res.status(400).json({ error: 'Asset name and URL are required' })
        }

        const { data: newAsset, error: insertError } = await supabase
          .from('assets')
          .insert({
            user_id: userId,
            name: name.trim(),
            url,
            type,
            description: description || null,
          })
          .select()
          .single()

        if (insertError) throw insertError

        return res.status(201).json(newAsset)

      case 'DELETE':
        // Delete asset (only if user owns it)
        if (!assetId) {
          return res.status(400).json({ error: 'Asset ID is required' })
        }

        const { data: existingAsset, error: fetchError } = await supabase
          .from('assets')
          .select('user_id')
          .eq('id', assetId)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Asset not found' })
          }
          throw fetchError
        }

        if (existingAsset.user_id !== userId) {
          return res.status(403).json({ error: 'Forbidden - You can only delete your own assets' })
        }

        const { error: deleteError } = await supabase
          .from('assets')
          .delete()
          .eq('id', assetId)

        if (deleteError) throw deleteError

        return res.status(200).json({ success: true })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Assets API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}

