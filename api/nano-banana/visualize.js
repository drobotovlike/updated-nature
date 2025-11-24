import { GoogleGenAI } from "@google/genai";

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
    const { furnitureBase64, roomBase64, description, useAIDesigner } = req.body

    // Allow prompt-only generation (no images required)
    if (!roomBase64 && !description) {
      return res.status(400).json({ error: 'Either a room image or a description is required' })
    }

    // Initialize Google GenAI client
    // Get API key from environment variable (required for Vercel serverless functions)
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return res.status(500).json({ error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' })
    }
    
    const ai = new GoogleGenAI({ apiKey })

    // Build the prompt
    let prompt = ''
    if (description) {
      prompt = description
    } else if (useAIDesigner) {
      prompt = 'Use your best judgment to create a beautiful interior design. Make it look natural and realistic with proper lighting and shadows.'
    } else if (roomBase64) {
      prompt = 'Enhance this room image with proper lighting, shadows, and perspective. Make it look realistic and well-composed.'
    } else {
      prompt = 'Create a beautiful interior design with proper lighting, shadows, and perspective. Make it look realistic and well-composed.'
    }

    // Prepare contents for image generation
    // According to official docs: contents can be a string (for text-to-image) 
    // or an array with parts (for image+text-to-image)
    let contents
    
    if (roomBase64 || furnitureBase64) {
      // Image editing mode: use array with parts
      const parts = []
      
      // Add room image if provided
      if (roomBase64) {
        const roomData = roomBase64.includes(',')
          ? roomBase64.split(',')[1]
          : roomBase64
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: roomData
          }
        })
      }
      
      // Add furniture/asset image if provided
      if (furnitureBase64) {
        const furnitureData = furnitureBase64.includes(',') 
          ? furnitureBase64.split(',')[1]
          : furnitureBase64
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: furnitureData
          }
        })
      }
      
      // Add text prompt
      parts.push({ text: prompt })
      
      contents = [{ parts: parts }]
    } else {
      // Text-to-image mode: can use just the prompt string
      contents = prompt
    }

    // Use Gemini 2.5 Flash Image model for image generation
    // According to official docs: ai.models.generateContent({ model, contents })
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contents,
    })

    // Log the response structure for debugging
    console.log('Response structure:', JSON.stringify(response, null, 2))
    console.log('Response type:', typeof response)
    console.log('Response keys:', Object.keys(response || {}))

    // Extract the generated image from response
    // According to docs: response.candidates[0].content.parts contains the result
    let imageUrl = null
    let textResult = null

    // Check different possible response structures
    if (response.candidates && response.candidates[0]?.content?.parts) {
      console.log('Found candidates structure')
      for (const part of response.candidates[0].content.parts) {
        console.log('Part:', Object.keys(part || {}))
        if (part.text) {
          textResult = part.text
          console.log('Found text:', textResult.substring(0, 100))
        } else if (part.inlineData) {
          console.log('Found inlineData')
          const imageData = part.inlineData
          if (imageData?.data) {
            imageUrl = `data:${imageData.mimeType || 'image/png'};base64,${imageData.data}`
            console.log('Image URL created, length:', imageUrl.length)
          }
        }
      }
    } else if (response.parts) {
      // Alternative structure: response.parts directly
      console.log('Found parts structure directly')
      for (const part of response.parts) {
        if (part.text) {
          textResult = part.text
        } else if (part.inlineData) {
          const imageData = part.inlineData
          if (imageData?.data) {
            imageUrl = `data:${imageData.mimeType || 'image/png'};base64,${imageData.data}`
          }
        }
      }
    } else if (response.text) {
      // Response might have text directly
      console.log('Found text directly on response')
      textResult = response.text
    }

    console.log('Final imageUrl:', imageUrl ? 'Found' : 'Not found')
    console.log('Final textResult:', textResult ? textResult.substring(0, 100) : 'Not found')

    if (!imageUrl && !textResult) {
      console.error('No image or text found in response')
      console.error('Full response:', JSON.stringify(response, null, 2))
      return res.status(500).json({ 
        error: {
          message: 'No image or text generated. The API response did not contain expected data.',
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
        note: 'Gemini returned text description instead of an image. This might happen if the model cannot generate images for this request.'
      })
    }

    return res.status(200).json({
      imageUrl: imageUrl,
      text: textResult,
      success: true
    })

  } catch (error) {
    console.error('Error processing visualization:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ 
      error: { 
        message: error.message || 'Failed to generate visualization',
        details: error.toString()
      } 
    })
  }
}

