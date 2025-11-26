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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

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

