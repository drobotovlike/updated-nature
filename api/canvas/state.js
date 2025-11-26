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
  const { projectId } = req.query

  if (!projectId) {
    return res.status(400).json({ error: 'projectId required' })
  }

  try {
    switch (method) {
      case 'GET':
        // Get canvas state
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
        // Create or update canvas state
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

        // Try to update first
        const { data: existingState } = await supabase
          .from('canvas_states')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single()

        let result
        if (existingState) {
          // Update
          const { data: updatedState, error: updateError } = await supabase
            .from('canvas_states')
            .update(stateData)
            .eq('id', existingState.id)
            .select()
            .single()

          if (updateError) throw updateError
          result = updatedState
        } else {
          // Insert
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

