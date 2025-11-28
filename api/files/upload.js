// File Upload API using Supabase Storage
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../utils/auth.js'
import { getSupabaseConfig } from '../utils/env.js'
import { logger } from '../utils/logger.js'

// Get Supabase configuration (fails fast if not set)
const { url: supabaseUrl, serviceKey: supabaseServiceKey } = getSupabaseConfig()

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function handler(req, res, userId) {
  // userId is verified and safe to use
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { fileBase64, fileName, fileType } = req.body

    if (!fileBase64) {
      return res.status(400).json({ error: 'File data is required' })
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64')
    
    // Generate unique file name
    const fileExtension = fileName.split('.').pop() || 'jpg'
    const uniqueFileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`

    // Upload to Supabase Storage
    // First, ensure the bucket exists (you need to create 'ature-files' bucket in Supabase Dashboard)
    // Make sure the bucket is PUBLIC or has proper RLS policies (see storage-policies.sql)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ature-files')
      .upload(uniqueFileName, fileBuffer, {
        contentType: fileType || 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      })

    if (uploadError) {
      logger.error('File upload error', { error: uploadError.message, userId })
      // If bucket doesn't exist, return error with instructions
      if (uploadError.message.includes('Bucket not found')) {
        return res.status(500).json({ 
          error: 'Storage bucket not configured',
          message: 'Please create a bucket named "ature-files" in Supabase Storage and make it public'
        })
      }
      // If RLS policy error, provide helpful message
      if (uploadError.message.includes('row-level security') || uploadError.message.includes('RLS')) {
        return res.status(500).json({ 
          error: 'Storage bucket RLS policy error',
          message: 'The storage bucket has RLS enabled. Please either: 1) Make the bucket public in Supabase Storage UI, or 2) Run the storage-policies.sql script in Supabase SQL Editor',
          details: uploadError.message
        })
      }
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ature-files')
      .getPublicUrl(uniqueFileName)

    return res.status(200).json({
      url: urlData.publicUrl,
      fileName: uniqueFileName,
      originalName: fileName,
      fileType: fileType || 'image',
      uploadedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Upload API error', { error: error.message, userId })
    return res.status(500).json({ 
      error: 'Failed to upload file', 
      details: error.message 
    })
  }
}

// Export with authentication middleware
export default requireAuth(handler)
