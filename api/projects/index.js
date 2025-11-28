// Cloud Storage API for Projects using Supabase
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../lib/server-utils/auth.js'
import { getSupabaseConfig } from '../../lib/server-utils/env.js'
import { logger } from '../../lib/server-utils/logger.js'

// Get Supabase configuration (fails fast if not set)
const { url: supabaseUrl, serviceKey: supabaseServiceKey } = getSupabaseConfig()

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function handler(req, res, userId) {
  // userId is verified and safe to use
  const startTime = Date.now()
  logger.debug('Projects API request', { method: req.method, userId, query: req.query })

  try {
    const { method } = req
    const { projectId, spaceId, action } = req.query

    // Handle design variations
    if (action === 'variations') {
      try {
        const { variationId } = req.query
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

    // Handle project metadata
    if (action === 'metadata') {
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

    // Handle project operations
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
        const { name, workflow, spaceId: newSpaceId, id: providedId } = req.body

        if (!name || !name.trim()) {
          return res.status(400).json({ error: 'Project name is required' })
        }

        // Build insert data - include ID if provided (from client-side UUID generation)
        const insertData = {
          user_id: userId,
          name: name.trim(),
          space_id: newSpaceId || null,
          workflow: workflow || {},
        }

        // If a UUID is provided, use it (ensures local and cloud IDs match)
        if (providedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedId)) {
          insertData.id = providedId
          console.log('Creating project with provided UUID:', providedId)
        } else {
          console.log('Creating project without provided UUID (will be generated by database)')
        }

        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          console.error('Error creating project:', insertError)
          // If ID conflict (project already exists), try to get existing project
          if (insertError.code === '23505' && providedId) {
            console.log('Project with this ID already exists, fetching existing project:', providedId)
            const { data: existingProject, error: getError } = await supabase
              .from('projects')
              .select('*')
              .eq('id', providedId)
              .eq('user_id', userId)
              .single()
            
            if (!getError && existingProject) {
              console.log('Returning existing project:', existingProject.id)
              return res.status(200).json(existingProject)
            }
          }
          throw insertError
        }

        console.log('Project created successfully:', { id: newProject.id, name: newProject.name, providedId })
        
        // Verify the returned ID matches what we sent (if we sent one)
        if (providedId && newProject.id !== providedId) {
          console.warn('WARNING: Project ID mismatch! Provided:', providedId, 'Returned:', newProject.id)
          // Return the project with the provided ID in the response metadata
          return res.status(201).json({
            ...newProject,
            _originalId: providedId, // Include original ID in response
            _idMismatch: true
          })
        }

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
    logger.error('Projects API error', { 
      method: req.method,
      userId,
      error: error.message,
      code: error.code,
      stack: error.stack
    })
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      code: error.code 
    })
  } finally {
    const duration = Date.now() - startTime
    logger.debug('Projects API response', { 
      method: req.method,
      status: res.statusCode,
      duration: `${duration}ms`
    })
  }
}

// Export with authentication middleware
export default requireAuth(handler)
