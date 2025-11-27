import { GoogleGenAI } from "@google/genai";

// Model configurations
const MODELS = {
  'gemini': {
    name: 'Gemini 2.5 Flash',
    handler: generateWithGemini,
    supportsReference: true,
  },
  'gpt-image': {
    name: 'GPT Image',
    handler: generateWithGPT,
    supportsReference: false,
  },
  'flux': {
    name: 'Flux Ultra',
    handler: generateWithFlux,
    supportsReference: true,
  },
  'imagen': {
    name: 'Imagen 4',
    handler: generateWithImagen,
    supportsReference: true,
  },
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const userId = req.headers.authorization?.replace('Bearer ', '')
  const { action } = req.query

  // Handle styles management
  if (action === 'styles') {
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://ifvqkmpyknfezpxscnef.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { method } = req
    const { id } = req.query

    try {
      switch (method) {
        case 'GET':
          const { data: styles, error: getError } = await supabase
            .from('styles')
            .select('*')
            .or(`is_public.eq.true,user_id.eq.${userId}`)
            .order('created_at', { ascending: false })

          if (getError) throw getError
          return res.status(200).json(styles || [])

        case 'POST':
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
          if (!id) {
            return res.status(400).json({ error: 'Style ID required' })
          }

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
            .eq('user_id', userId)
            .select()
            .single()

          if (updateError) throw updateError
          return res.status(200).json(updatedStyle)

        case 'DELETE':
          if (!id) {
            return res.status(400).json({ error: 'Style ID required' })
          }

          const { error: deleteError } = await supabase
            .from('styles')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

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

  // Handle image generation (original functionality)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      prompt,
      model = 'gemini',
      style_id,
      reference_image,
      reference_strength = 0.7,
      aspect_ratio = '1:1',
      quality = 'standard',
      seed,
    } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' })
    }

    const modelConfig = MODELS[model]
    if (!modelConfig) {
      return res.status(400).json({ error: `Unsupported model: ${model}` })
    }

    // Apply style if provided
    let finalPrompt = prompt
    if (style_id) {
      // Style will be applied by fetching from database
      // For now, we'll handle it in the frontend
      // This is a placeholder - styles will be fetched and applied
    }

    // Generate with selected model
    const result = await modelConfig.handler({
      prompt: finalPrompt,
      reference_image,
      reference_strength,
      aspect_ratio,
      quality,
      seed,
    })

    return res.status(200).json({
      imageUrl: result.imageUrl,
      text: result.text,
      model: model,
      success: true,
    })

  } catch (error) {
    console.error('Error in generation API:', error)
    return res.status(500).json({
      error: {
        message: error.message || 'Failed to generate image',
        details: error.toString()
      }
    })
  }
}

// Gemini handler (existing implementation)
async function generateWithGemini({ prompt, reference_image, reference_strength, aspect_ratio, quality, seed }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const ai = new GoogleGenAI({ apiKey })

  let contents
  if (reference_image) {
    const parts = []
    const refData = reference_image.includes(',')
      ? reference_image.split(',')[1]
      : reference_image
    
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: refData
      }
    })
    parts.push({ text: prompt })
    contents = [{ parts: parts }]
  } else {
    contents = prompt
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: contents,
  })

  let imageUrl = null
  let textResult = null

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        textResult = part.text
      } else if (part.inlineData) {
        const imageData = part.inlineData
        if (imageData?.data) {
          imageUrl = `data:${imageData.mimeType || 'image/png'};base64,${imageData.data}`
        }
      }
    }
  }

  if (!imageUrl && !textResult) {
    throw new Error('No image or text generated from Gemini')
  }

  return { imageUrl, text: textResult }
}

// GPT Image handler (placeholder - requires OpenAI API key)
async function generateWithGPT({ prompt, reference_image, reference_strength, aspect_ratio, quality, seed }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. GPT Image model requires OpenAI API key.')
  }

  // TODO: Implement OpenAI DALL-E 3 integration
  // For now, return error
  throw new Error('GPT Image model not yet implemented. Please use Gemini or Flux.')
}

// Flux handler (placeholder - requires Stability AI API key)
async function generateWithFlux({ prompt, reference_image, reference_strength, aspect_ratio, quality, seed }) {
  const apiKey = process.env.STABILITY_API_KEY
  if (!apiKey) {
    throw new Error('STABILITY_API_KEY is not set. Flux model requires Stability AI API key.')
  }

  // TODO: Implement Stability AI Flux integration
  // For now, return error
  throw new Error('Flux model not yet implemented. Please use Gemini.')
}

// Imagen handler (placeholder - requires Google Cloud API key)
async function generateWithImagen({ prompt, reference_image, reference_strength, aspect_ratio, quality, seed }) {
  // TODO: Implement Google Imagen 4 integration
  throw new Error('Imagen model not yet implemented. Please use Gemini.')
}

