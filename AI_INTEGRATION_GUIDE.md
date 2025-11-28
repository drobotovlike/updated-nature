# AI Integration Guide

This document outlines the AI model integrations and their implementation status.

## Currently Implemented ✅

### Gemini 2.5 Flash Image
- **Status:** ✅ Fully Implemented
- **File:** `api/generate/index.js`
- **API:** Google Gemini API
- **Features:**
  - Text-to-image generation
  - Reference image support
  - Fast generation (5-10 seconds)

## Partially Implemented ⚠️

### Image Processing
- **Status:** ⚠️ Mock implementations only
- **Files:** `api/image-editing/index.js`, `api/image-processing/index.js`
- **Features Needed:**
  - Background removal
  - Image upscaling
  - Inpainting
  - Outpainting
  - Style transfer
  - Loop/GIF generation

**Recommended Services:**
- [Replicate](https://replicate.com/) - AI model hosting
- [Remove.bg](https://www.remove.bg/api) - Background removal
- [Stability AI](https://platform.stability.ai/) - Various AI models

## Not Implemented ❌

### DALL-E 3 (OpenAI)
- **Status:** ❌ Not Implemented
- **File:** `api/generate/index.js:268-270`
- **Requirements:**
  - OpenAI API key: `OPENAI_API_KEY`
  - OpenAI SDK: `npm install openai`
  
**Implementation Steps:**
```bash
npm install openai
```

```javascript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function generateWithGPT({ prompt, aspect_ratio, quality }) {
  const size = aspect_ratio === '1:1' ? '1024x1024' : '1792x1024'
  
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: size,
    quality: quality === 'hd' ? 'hd' : 'standard'
  })

  return {
    imageUrl: response.data[0].url,
    text: response.data[0].revised_prompt
  }
}
```

### Flux Ultra (Stability AI)
- **Status:** ❌ Not Implemented
- **File:** `api/generate/index.js:280-282`
- **Requirements:**
  - Stability AI API key: `STABILITY_API_KEY`
  - HTTP client for API calls

**Implementation Steps:**
```javascript
async function generateWithFlux({ prompt, reference_image, aspect_ratio }) {
  const apiKey = process.env.STABILITY_API_KEY
  
  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/ultra', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'image/*'
    },
    body: JSON.stringify({
      prompt: prompt,
      aspect_ratio: aspect_ratio || '1:1',
      output_format: 'png'
    })
  })
  
  if (!response.ok) {
    throw new Error(`Stability AI error: ${response.statusText}`)
  }
  
  const imageBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(imageBuffer).toString('base64')
  
  return {
    imageUrl: `data:image/png;base64,${base64}`,
    text: null
  }
}
```

### Imagen 4 (Google Cloud)
- **Status:** ❌ Not Implemented
- **File:** `api/generate/index.js:287-288`
- **Requirements:**
  - Google Cloud project with Imagen API enabled
  - Service account credentials
  - Google Cloud SDK

**Implementation Steps:**
1. Enable Imagen API in Google Cloud Console
2. Create service account and download JSON key
3. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
4. Use `@google-cloud/aiplatform` SDK

## Environment Variables Required

```env
# Currently Required
GEMINI_API_KEY=your_gemini_api_key

# For Full Functionality
OPENAI_API_KEY=your_openai_api_key           # For DALL-E 3
STABILITY_API_KEY=your_stability_api_key     # For Flux Ultra
REPLICATE_API_TOKEN=your_replicate_token     # For image processing
REMOVE_BG_API_KEY=your_removebg_key          # For background removal (optional)

# Google Cloud (for Imagen)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

## Cost Estimates

| Service | Cost | Usage Limit |
|---------|------|-------------|
| Gemini 2.5 Flash | Free tier: 1,500 requests/day | Good for MVP |
| DALL-E 3 | $0.04 per image (standard) | Moderate cost |
| Flux Ultra | ~$0.055 per image | Low cost |
| Replicate | Varies by model | Pay-per-use |
| Remove.bg | $0.20 per image (API) | Can be expensive |

## Recommendations

### For MVP / Testing
- ✅ Use Gemini only (currently working)
- ✅ Mock other features with placeholders
- ✅ Focus on core functionality first

### For Production
1. **Immediate Priority:**
   - Implement DALL-E 3 (most requested)
   - Implement basic background removal (key feature)

2. **Medium Priority:**
   - Flux Ultra (alternative to DALL-E)
   - Image upscaling (quality improvement)

3. **Nice to Have:**
   - Imagen 4 (if using Google Cloud)
   - Advanced features (style transfer, etc.)

## Testing Strategy

### For Each Model Integration

1. **Unit Tests:**
```javascript
describe('DALL-E Integration', () => {
  test('generates image from prompt', async () => {
    const result = await generateWithGPT({ 
      prompt: 'modern living room' 
    })
    expect(result.imageUrl).toBeDefined()
  })
  
  test('handles API errors gracefully', async () => {
    // Test with invalid API key
    await expect(generateWithGPT({ prompt: 'test' }))
      .rejects.toThrow('API key invalid')
  })
})
```

2. **Integration Tests:**
- Test with real API (in staging environment)
- Verify image quality and format
- Test rate limiting
- Test cost tracking

3. **UI Tests:**
- Verify model selector works
- Test loading states
- Test error messages
- Verify image display

## Migration Path

If you want to implement these features:

1. **Choose Services:** Decide which AI services to integrate
2. **Set Up Accounts:** Create API accounts and get keys
3. **Add Environment Variables:** Set up in Vercel dashboard
4. **Implement Handler Functions:** Update `api/generate/index.js`
5. **Test Thoroughly:** Use integration tests
6. **Update UI:** Remove "not implemented" from UI if needed
7. **Monitor Costs:** Set up billing alerts

## Alternative: Remove Unimplemented Features

If you don't plan to implement these features soon:

```javascript
// Update MODELS object in api/generate/index.js
const MODELS = {
  'gemini': {
    name: 'Gemini 2.5 Flash',
    handler: generateWithGemini,
    supportsReference: true,
  },
  // Remove gpt-image, flux, imagen if not implementing
}
```

And update the UI to only show available models.

