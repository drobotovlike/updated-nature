import { GoogleGenAI } from "@google/genai";
import { requireAuth } from '../_utils/auth.js'

async function handler(req, res, userId) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // userId is now verified and safe to use
  console.log(`[Inpaint] Request from authenticated user: ${userId}`)

  try {
    const { imageBase64, maskBase64, prompt, removalType } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required' })
    }

    if (!maskBase64) {
      return res.status(400).json({ error: 'Mask is required' })
    }

    // Initialize Google GenAI client
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return res.status(500).json({ error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' })
    }
    
    const ai = new GoogleGenAI({ apiKey })

    // Build intelligent prompt based on removal type
    let removalPrompt = ''
    
    if (prompt) {
      // Use custom prompt if provided
      removalPrompt = prompt
    } else if (removalType) {
      // Use type-specific prompts
      const prompts = {
        'people': 'Remove all people from this interior design image while keeping the room intact. Fill the area seamlessly to match the surrounding environment with realistic lighting, shadows, and textures.',
        'pets': 'Remove all pets and animals from this interior design image. Fill the area naturally to match the room\'s floor, furniture, and surroundings.',
        'clutter': 'Remove clutter, temporary items, and small unwanted objects from this room. Clean up the space while maintaining the room\'s aesthetic and structure.',
        'furniture': 'Remove the selected furniture pieces from this room image. Fill the area with appropriate floor, wall, or background elements that match the room\'s style.',
        'objects': 'Remove the selected unwanted objects from this interior design image. Intelligently fill the masked area to seamlessly match the surrounding room environment with proper lighting, shadows, textures, and perspective.'
      }
      removalPrompt = prompts[removalType] || prompts['objects']
    } else {
      // Default intelligent removal prompt
      removalPrompt = 'Remove the masked objects from this interior design image and intelligently fill the area to seamlessly match the surrounding room environment. Maintain realistic lighting, shadows, textures, and perspective. The filled area should look natural and blend perfectly with the rest of the scene.'
    }

    // Extract base64 data (remove data URL prefix if present)
    const imageData = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64
    
    const maskData = maskBase64.includes(',')
      ? maskBase64.split(',')[1]
      : maskBase64

    // Prepare contents for inpainting
    // Send original image, mask, and prompt to Gemini
    const contents = [{
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData
          }
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: maskData
          }
        },
        {
          text: removalPrompt
        }
      ]
    }]

    // Use Gemini 2.5 Flash Image model for inpainting
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contents,
    })

    // Extract the generated image from response
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
      console.error('No image or text found in response')
      return res.status(500).json({ 
        error: {
          message: 'No image generated. The API response did not contain expected data.',
          details: 'Response structure: ' + JSON.stringify(response).substring(0, 500)
        }
      })
    }

    if (!imageUrl) {
      // If we got text but no image, return the text with a note
      return res.status(200).json({
        imageUrl: null,
        text: textResult,
        success: true,
        note: 'Gemini returned text description instead of an image.'
      })
    }

    return res.status(200).json({
      imageUrl: imageUrl,
      text: textResult,
      success: true
    })

  } catch (error) {
    console.error('Error processing inpainting:', error)
    console.error('Error stack:', error.stack)
    
    // Check for quota/rate limit errors (429)
    if (error.code === 429 || 
        error.status === 'RESOURCE_EXHAUSTED' || 
        error.message?.includes('quota') ||
        error.message?.includes('exceeded your current quota')) {
      
      // Extract retry delay from error details
      let retryAfter = '22'
      try {
        if (error.details && Array.isArray(error.details)) {
          const retryInfo = error.details.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')
          if (retryInfo?.retryDelay) {
            retryAfter = Math.ceil(parseFloat(retryInfo.retryDelay)).toString()
          }
        }
        if (error.retryDelay) {
          retryAfter = Math.ceil(parseFloat(error.retryDelay)).toString()
        }
      } catch (e) {
        console.warn('Could not parse retry delay:', e)
      }
      
      return res.status(429).json({ 
        error: { 
          message: 'API quota exceeded. You have reached the free tier limit for Gemini API.',
          code: 'QUOTA_EXCEEDED',
          retryAfter: retryAfter,
          details: 'Please wait before trying again, or upgrade your Google AI Studio plan for higher limits.',
          helpUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
          usageUrl: 'https://ai.dev/usage?tab=rate-limit'
        } 
      })
    }
    
    // Check for API key errors
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      return res.status(500).json({ 
        error: { 
          message: 'Gemini API key error. Please check your API key configuration.',
          code: 'API_KEY_ERROR'
        } 
      })
    }
    
    return res.status(500).json({ 
      error: { 
        message: error.message || 'Failed to remove objects',
        details: error.toString()
      } 
    })
  }
}

// Export with authentication middleware
export default requireAuth(handler)

