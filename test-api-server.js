// Simple test server for local API testing
// Run this with: node test-api-server.js
// Then the frontend can call /api/nano-banana/visualize

import { GoogleGenAI } from "@google/genai";
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local if it exists
try {
  const envPath = join(__dirname, '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Loaded .env.local');
} catch (error) {
  // .env.local doesn't exist, that's okay
  console.log('ℹ️  No .env.local found, using environment variables or defaults');
}

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Set API key from environment or use default
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCiii8MavrMfk6XBDzIUcahIAlTRemxWNY';

app.post('/api/nano-banana/visualize', async (req, res) => {
  try {
    const { furnitureBase64, roomBase64, description, useAIDesigner } = req.body;

    // Allow prompt-only generation (no images required)
    if (!roomBase64 && !description) {
      return res.status(400).json({ error: 'Either a room image or a description is required' });
    }

    // Initialize Google GenAI client
    // According to docs: can pass {} and it auto-picks up GEMINI_API_KEY from env
    // Or explicitly pass { apiKey: '...' }
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured. Please set GEMINI_API_KEY environment variable.' });
    }
    
    // Initialize with explicit API key
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Build the prompt
    let prompt = '';
    if (description) {
      prompt = description;
    } else if (useAIDesigner) {
      prompt = 'Use your best judgment to create a beautiful interior design. Make it look natural and realistic with proper lighting and shadows.';
    } else if (roomBase64) {
      prompt = 'Enhance this room image with proper lighting, shadows, and perspective. Make it look realistic and well-composed.';
    } else {
      prompt = 'Create a beautiful interior design with proper lighting, shadows, and perspective. Make it look realistic and well-composed.';
    }

    // Prepare contents for image generation
    // According to official docs: contents can be a string (for text-to-image) 
    // or an array with parts (for image+text-to-image)
    let contents;
    
    if (roomBase64 || furnitureBase64) {
      // Image editing mode: use array with parts
      const parts = [];
      
      // Add room image if provided
      if (roomBase64) {
        const roomData = roomBase64.includes(',')
          ? roomBase64.split(',')[1]
          : roomBase64;
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: roomData
          }
        });
      }
      
      // Add furniture/asset image if provided
      if (furnitureBase64) {
        const furnitureData = furnitureBase64.includes(',') 
          ? furnitureBase64.split(',')[1]
          : furnitureBase64;
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: furnitureData
          }
        });
      }
      
      // Add text prompt
      parts.push({ text: prompt });
      
      contents = [{ parts: parts }];
    } else {
      // Text-to-image mode: can use just the prompt string
      contents = prompt;
    }

    // Use Gemini 2.5 Flash Image model
    // According to official docs: ai.models.generateContent({ model, contents })
    console.log('Calling Gemini API with model: gemini-2.5-flash-image');
    console.log('Contents type:', typeof contents, Array.isArray(contents) ? 'array' : 'string');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: contents,
    });

    // Log the response structure for debugging
    console.log('Response structure:', JSON.stringify(response, null, 2));
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response || {}));

    // Extract the generated image
    // According to official docs: response.candidates[0].content.parts
    let imageUrl = null;
    let textResult = null;

    console.log('Response has candidates?', !!response.candidates);
    console.log('Response candidates length:', response.candidates?.length);
    
    if (response.candidates && response.candidates[0]?.content?.parts) {
      console.log('✅ Found candidates structure');
      for (const part of response.candidates[0].content.parts) {
        console.log('Part type:', part.text ? 'text' : part.inlineData ? 'image' : 'unknown');
        if (part.text) {
          textResult = part.text;
          console.log('Found text:', textResult.substring(0, 100));
        } else if (part.inlineData) {
          console.log('✅ Found inlineData (image)');
          const imageData = part.inlineData;
          if (imageData?.data) {
            imageUrl = `data:${imageData.mimeType || 'image/png'};base64,${imageData.data}`;
            console.log('✅ Image URL created, length:', imageUrl.length);
          } else {
            console.error('❌ inlineData exists but no data field');
          }
        }
      }
    } else {
      console.error('❌ Unexpected response structure');
      console.error('Response keys:', Object.keys(response || {}));
    }

    console.log('Final imageUrl:', imageUrl ? 'Found' : 'Not found');
    console.log('Final textResult:', textResult ? textResult.substring(0, 100) : 'Not found');

    if (!imageUrl && !textResult) {
      console.error('No image or text found in response');
      throw new Error('No image or text generated. Response structure: ' + JSON.stringify(response).substring(0, 500));
    }

    if (!imageUrl) {
      return res.status(200).json({
        imageUrl: null,
        text: textResult,
        success: true,
        note: 'Gemini returned text description instead of an image.'
      });
    }

    return res.status(200).json({
      imageUrl: imageUrl,
      text: textResult,
      success: true
    });

  } catch (error) {
    console.error('❌ Error processing visualization:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('Error response:', error.response);
    }
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    return res.status(500).json({ 
      error: {
        message: error.message || 'Failed to generate visualization',
        details: error.toString(),
        name: error.name,
        code: error.code,
        status: error.status,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Test API server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/nano-banana/visualize`);
  console.log(`🔑 Using GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set ✓' : 'Not set ✗'}`);
});

