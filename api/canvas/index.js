import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = req.headers.authorization?.replace('Bearer ', '')
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { method } = req
  const { projectId, itemId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (itemId) {
          // Get single canvas item
          const { data: item, error: itemError } = await supabase
            .from('canvas_items')
            .select('*')
            .eq('id', itemId)
            .eq('user_id', userId)
            .single()

          if (itemError) {
            if (itemError.code === 'PGRST116') {
              return res.status(404).json({ error: 'Item not found' })
            }
            throw itemError
          }

          return res.status(200).json(item)
        } else if (projectId) {
          // Get all canvas items for project
          const { data: items, error: itemsError } = await supabase
            .from('canvas_items')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .order('z_index', { ascending: true })
            .order('created_at', { ascending: true })

          if (itemsError) throw itemsError

          // Get canvas state
          const { data: state, error: stateError } = await supabase
            .from('canvas_states')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single()

          return res.status(200).json({
            items: items || [],
            state: state || null,
          })
        } else {
          return res.status(400).json({ error: 'projectId or itemId required' })
        }

      case 'POST':
        // Create new canvas item
        const {
          image_url,
          x_position = 0,
          y_position = 0,
          width,
          height,
          rotation = 0,
          scale_x = 1,
          scale_y = 1,
          z_index = 0,
          name,
          description,
          prompt,
          opacity = 1,
          filters,
          metadata,
        } = req.body

        if (!image_url || !projectId) {
          return res.status(400).json({ error: 'image_url and projectId are required' })
        }

        const { data: newItem, error: insertError } = await supabase
          .from('canvas_items')
          .insert({
            project_id: projectId,
            user_id: userId,
            image_url,
            x_position,
            y_position,
            width,
            height,
            rotation,
            scale_x,
            scale_y,
            z_index,
            name: name || `Design ${Date.now()}`,
            description,
            prompt,
            opacity,
            filters: filters || {},
            metadata: metadata || {},
          })
          .select()
          .single()

        if (insertError) throw insertError

        return res.status(201).json(newItem)

      case 'PUT':
        if (!itemId) {
          return res.status(400).json({ error: 'itemId required for update' })
        }

        // Update canvas item
        const updateData = {}
        const allowedFields = [
          'x_position',
          'y_position',
          'width',
          'height',
          'rotation',
          'scale_x',
          'scale_y',
          'z_index',
          'name',
          'description',
          'is_selected',
          'is_locked',
          'opacity',
          'filters',
          'metadata',
        ]

        allowedFields.forEach((field) => {
          if (req.body[field] !== undefined) {
            updateData[field] = req.body[field]
          }
        })

        const { data: updatedItem, error: updateError } = await supabase
          .from('canvas_items')
          .update(updateData)
          .eq('id', itemId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError

        return res.status(200).json(updatedItem)

      case 'DELETE':
        if (!itemId) {
          return res.status(400).json({ error: 'itemId required for delete' })
        }

        const { error: deleteError } = await supabase
          .from('canvas_items')
          .delete()
          .eq('id', itemId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError

        return res.status(200).json({ success: true })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Canvas API error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

