// Export API - Simplified version (high-res image export)
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../_utils/auth.js'
import { getSupabaseConfig } from '../_utils/env.js'
import { logger } from '../_utils/logger.js'

// Get Supabase configuration
const config = getSupabaseConfig()

// Create Supabase client (may be null if not configured)
const supabase = config.isConfigured 
  ? createClient(config.url, config.serviceKey)
  : null

async function handler(req, res, userId) {
  // Check if Supabase is configured
  if (!supabase) {
    logger.error('Supabase not configured - missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in Vercel.',
    })
  }

  // userId is verified and safe to use

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { projectId, format, resolution } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, project_metadata(*)')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const resultUrl = project.workflow?.result?.url || project.workflow?.resultUrl

    if (!resultUrl) {
      return res.status(400).json({ error: 'No result image found' })
    }

    // For now, return the image URL directly
    // In production, you would fetch and process the image here
    // For PDF generation, you would need pdfkit or similar library
    
    if (format === 'pdf') {
      // PDF generation would require pdfkit
      // For now, return error suggesting image format
      return res.status(400).json({ 
        error: 'PDF export requires additional setup. Please use PNG or JPG format.',
        suggestion: 'Use format: png or jpg'
      })
    }

    // Return image URL for download
    // Client will handle the download
    return res.status(200).json({
      url: resultUrl,
      format: format || 'png',
      resolution: resolution || 'original',
      filename: `${project.name}.${format || 'png'}`
    })
  } catch (error) {
    console.error('Export API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

// Export with authentication middleware
export default requireAuth(handler)

