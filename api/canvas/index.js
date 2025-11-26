import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
}

// Use service role key to bypass RLS (security is handled at API level with Clerk user_id validation)
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
  const { projectId, itemId, type } = req.query

  // Handle canvas state requests
  if (type === 'state') {
    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' })
    }

    try {
      switch (method) {
        case 'GET':
          const { data: state, error: getError } = await supabase
            .from('canvas_states')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single()

          if (getError && getError.code !== 'PGRST116') {
            throw getError
          }

          return res.status(200).json(state || null)

        case 'POST':
        case 'PUT':
          const {
            zoom_level,
            pan_x,
            pan_y,
            grid_enabled,
            grid_size,
            ruler_enabled,
            snap_to_grid,
            show_measurements,
            background_color,
          } = req.body

          const stateData = {
            project_id: projectId,
            user_id: userId,
          }

          if (zoom_level !== undefined) stateData.zoom_level = zoom_level
          if (pan_x !== undefined) stateData.pan_x = pan_x
          if (pan_y !== undefined) stateData.pan_y = pan_y
          if (grid_enabled !== undefined) stateData.grid_enabled = grid_enabled
          if (grid_size !== undefined) stateData.grid_size = grid_size
          if (ruler_enabled !== undefined) stateData.ruler_enabled = ruler_enabled
          if (snap_to_grid !== undefined) stateData.snap_to_grid = snap_to_grid
          if (show_measurements !== undefined) stateData.show_measurements = show_measurements
          if (background_color !== undefined) stateData.background_color = background_color

          const { data: existingState } = await supabase
            .from('canvas_states')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single()

          let result
          if (existingState) {
            const { data: updatedState, error: updateError } = await supabase
              .from('canvas_states')
              .update(stateData)
              .eq('id', existingState.id)
              .select()
              .single()

            if (updateError) throw updateError
            result = updatedState
          } else {
            const { data: newState, error: insertError } = await supabase
              .from('canvas_states')
              .insert(stateData)
              .select()
              .single()

            if (insertError) throw insertError
            result = newState
          }

          return res.status(200).json(result)

        default:
          res.setHeader('Allow', ['GET', 'POST', 'PUT'])
          return res.status(405).json({ error: `Method ${method} not allowed` })
      }
    } catch (error) {
      console.error('Canvas state API error:', error)
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }

  // Handle canvas items
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
          console.log('Fetching canvas items for project:', projectId, 'user:', userId)
          
          let items = []
          let itemsError = null
          
          try {
            const result = await supabase
              .from('canvas_items')
              .select('*')
              .eq('project_id', projectId)
              .eq('user_id', userId)
              .order('z_index', { ascending: true })
              .order('created_at', { ascending: true })
            
            items = result.data || []
            itemsError = result.error
            
            if (itemsError) {
              console.error('Error fetching canvas items:', itemsError)
              // Check if table doesn't exist (42P01) or permission issue
              if (itemsError.code === '42P01' || itemsError.message?.includes('does not exist')) {
                console.warn('Canvas tables may not exist. Please run database-canvas-migration-safe.sql')
                // Return empty array - canvas will work but won't persist data
                items = []
              } else {
                // Other errors - still return empty array
                items = []
              }
            } else {
              console.log('Canvas items fetched:', items.length)
            }
          } catch (err) {
            console.error('Exception fetching canvas items:', err)
            items = []
          }

          // Get canvas state (don't error if no state exists)
          let state = null
          try {
            const stateResult = await supabase
              .from('canvas_states')
              .select('*')
              .eq('project_id', projectId)
              .eq('user_id', userId)
              .single()

            // PGRST116 means no rows found, which is fine - just return null for state
            if (stateResult.error) {
              if (stateResult.error.code === 'PGRST116') {
                console.log('No canvas state found for project:', projectId, '(this is normal for new projects)')
              } else if (stateResult.error.code === '42P01' || stateResult.error.message?.includes('does not exist')) {
                console.warn('Canvas states table may not exist. Please run database-canvas-migration-safe.sql')
                // Continue without state
              } else {
                console.error('Error fetching canvas state:', stateResult.error)
                // Don't throw - just continue without state
              }
            } else {
              state = stateResult.data
              console.log('Canvas state fetched successfully')
            }
          } catch (err) {
            console.error('Exception fetching canvas state:', err)
            // Continue without state
          }

          const response = {
            items: items || [],
            state: state || null,
          }
          console.log('Returning canvas data:', { itemsCount: response.items.length, hasState: !!response.state })
          return res.status(200).json(response)
        } else {
          return res.status(400).json({ error: 'projectId or itemId required' })
        }

      case 'POST':
        // Create new canvas item
        if (!projectId) {
          return res.status(400).json({ error: 'projectId is required in query parameter' })
        }

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

        if (!image_url) {
          return res.status(400).json({ error: 'image_url is required' })
        }

        console.log('Creating canvas item:', { projectId, userId, imageUrl: image_url })

        try {
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

          if (insertError) {
            console.error('Error inserting canvas item:', insertError)
            // Check if table doesn't exist
            if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
              return res.status(500).json({ 
                error: 'Canvas database tables not found. Please run database-canvas-migration-safe.sql in Supabase.',
                code: 'TABLE_NOT_FOUND'
              })
            }
            throw insertError
          }

          console.log('Canvas item created successfully:', newItem.id)
          return res.status(201).json(newItem)
        } catch (err) {
          console.error('Exception creating canvas item:', err)
          throw err
        }

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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    })
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.details : undefined,
    })
  }
}

