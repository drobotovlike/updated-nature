import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

// Use service role key to bypass RLS (security is handled at API level with Clerk user_id validation)
// IMPORTANT: SUPABASE_SERVICE_ROLE_KEY should be set in Vercel environment variables
// If not set, it falls back to anon key which is subject to RLS policies
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

// Log which key is being used (for debugging - remove in production)
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('✅ Using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)')
} else if (process.env.SUPABASE_ANON_KEY) {
  console.warn('⚠️ Using SUPABASE_ANON_KEY (subject to RLS) - set SUPABASE_SERVICE_ROLE_KEY in Vercel for better performance')
} else {
  console.error('❌ No Supabase key found!')
}

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
  const { assetId, action } = req.query

  // Handle asset tags
  if (action === 'tags') {
    const { tag } = req.query
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
            const { data: userAssets } = await supabase
              .from('assets')
              .select('id')
              .eq('user_id', userId)

            if (!userAssets || userAssets.length === 0) {
              return res.status(200).json({ tags: [] })
            }

            const assetIds = userAssets.map(a => a.id)
            const { data: tags, error } = await supabase
              .from('asset_tags')
              .select('tag')
              .in('asset_id', assetIds)

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

  // Handle asset operations
  switch (method) {
      case 'GET':
        if (assetId) {
          // Get single asset (only if user owns it)
          const { data: asset, error: assetError } = await supabase
            .from('assets')
            .select('*')
            .eq('id', assetId)
            .eq('user_id', userId) // Only return if user owns it
            .single()

          if (assetError) {
            if (assetError.code === 'PGRST116') {
              return res.status(404).json({ error: 'Asset not found' })
            }
            throw assetError
          }

          return res.status(200).json(asset)
        } else {
          // Get user's private assets with search and filter support
          const { search, tags, sortBy, sortOrder } = req.query
          
          let query = supabase
            .from('assets')
            .select(`
              *,
              asset_tags(tag)
            `)
            .eq('user_id', userId)

          // Search by name or description
          if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
          }

          // Filter by tags (if tags parameter provided)
          if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags]
            // This requires a join - simplified for now
            // Full implementation would use a subquery
          }

          // Sorting
          const sortColumn = sortBy || 'created_at'
          const ascending = sortOrder !== 'desc'
          query = query.order(sortColumn, { ascending })

          const { data: assets, error: assetsError } = await query

          if (assetsError) throw assetsError

          // Filter by tags in memory if needed (simplified approach)
          let filteredAssets = assets || []
          if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags]
            filteredAssets = filteredAssets.filter(asset => {
              const assetTags = asset.asset_tags?.map(t => t.tag) || []
              return tagArray.some(tag => assetTags.includes(tag))
            })
          }

          return res.status(200).json({ assets: filteredAssets })
        }

      case 'POST':
        // Add asset to user's private library
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

        if (insertError) {
          console.error('Supabase insert error:', insertError)
          // Provide more detailed error message
          if (insertError.message.includes('row-level security') || insertError.message.includes('RLS')) {
            return res.status(403).json({ 
              error: 'RLS policy violation',
              message: 'Row-level security policy blocked the insert. Please check RLS policies on assets table.',
              details: insertError.message
            })
          }
          throw insertError
        }

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

