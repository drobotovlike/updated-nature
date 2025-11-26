import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = req.headers.authorization?.replace('Bearer ', '')
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { method } = req
  const { id } = req.query

  try {
    switch (method) {
      case 'GET':
        // Get all styles (public + user's private styles)
        const { data: styles, error: getError } = await supabase
          .from('styles')
          .select('*')
          .or(`is_public.eq.true,user_id.eq.${userId}`)
          .order('created_at', { ascending: false })

        if (getError) throw getError

        return res.status(200).json(styles || [])

      case 'POST':
        // Create new style
        const { name, description, prompt_suffix, preview_image_url, category, is_public } = req.body

        if (!name || !prompt_suffix) {
          return res.status(400).json({ error: 'Name and prompt_suffix are required' })
        }

        const { data: newStyle, error: createError } = await supabase
          .from('styles')
          .insert({
            user_id: userId,
            name,
            description,
            prompt_suffix,
            preview_image_url,
            category: category || 'custom',
            is_public: is_public || false,
          })
          .select()
          .single()

        if (createError) throw createError

        return res.status(201).json(newStyle)

      case 'PUT':
        // Update style (only if user owns it)
        if (!id) {
          return res.status(400).json({ error: 'Style ID required' })
        }

        // Check ownership
        const { data: existingStyle, error: checkError } = await supabase
          .from('styles')
          .select('user_id')
          .eq('id', id)
          .single()

        if (checkError) throw checkError

        if (existingStyle.user_id !== userId && !existingStyle.is_public) {
          return res.status(403).json({ error: 'You can only edit your own styles' })
        }

        const { data: updatedStyle, error: updateError } = await supabase
          .from('styles')
          .update({
            name: req.body.name,
            description: req.body.description,
            prompt_suffix: req.body.prompt_suffix,
            preview_image_url: req.body.preview_image_url,
            category: req.body.category,
            is_public: req.body.is_public,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', userId) // Only allow updating own styles
          .select()
          .single()

        if (updateError) throw updateError

        return res.status(200).json(updatedStyle)

      case 'DELETE':
        // Delete style (only if user owns it)
        if (!id) {
          return res.status(400).json({ error: 'Style ID required' })
        }

        const { error: deleteError } = await supabase
          .from('styles')
          .delete()
          .eq('id', id)
          .eq('user_id', userId) // Only allow deleting own styles

        if (deleteError) throw deleteError

        return res.status(200).json({ success: true })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Error in styles API:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error',
    })
  }
}

