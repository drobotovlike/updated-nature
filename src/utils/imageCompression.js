/**
 * Image Compression Utility
 * Compresses images to reduce file size before sending to API
 * Helps prevent 413 Payload Too Large errors
 */

/**
 * Compress an image to a maximum dimension and quality
 * @param {string} imageUrl - URL or data URL of the image
 * @param {number} maxWidth - Maximum width in pixels (default: 2048)
 * @param {number} maxHeight - Maximum height in pixels (default: 2048)
 * @param {number} quality - JPEG quality 0-1 (default: 0.85)
 * @returns {Promise<string>} - Compressed image as base64 data URL
 */
export async function compressImage(imageUrl, maxWidth = 2048, maxHeight = 2048, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        
        // Create canvas for compression
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      } catch (error) {
        reject(new Error(`Image compression failed: ${error.message}`))
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = imageUrl
  })
}

/**
 * Compress a blob/File to base64 with size limits
 * @param {Blob|File} file - Image file to compress
 * @param {number} maxWidth - Maximum width in pixels (default: 2048)
 * @param {number} maxHeight - Maximum height in pixels (default: 2048)
 * @param {number} quality - JPEG quality 0-1 (default: 0.85)
 * @returns {Promise<string>} - Compressed image as base64 data URL
 */
export async function compressFile(file, maxWidth = 2048, maxHeight = 2048, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const compressed = await compressImage(e.target.result, maxWidth, maxHeight, quality)
        resolve(compressed)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file for compression'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Compress canvas to base64 with size limits
 * @param {HTMLCanvasElement} canvas - Canvas element to compress
 * @param {number} maxWidth - Maximum width in pixels (default: 2048)
 * @param {number} maxHeight - Maximum height in pixels (default: 2048)
 * @param {number} quality - JPEG quality 0-1 (default: 0.85)
 * @returns {Promise<string>} - Compressed image as base64 data URL
 */
export async function compressCanvas(canvas, maxWidth = 2048, maxHeight = 2048, quality = 0.85) {
  return new Promise((resolve, reject) => {
    try {
      let width = canvas.width
      let height = canvas.height
      
      // Resize if necessary
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        
        // Create new canvas with resized dimensions
        const resizedCanvas = document.createElement('canvas')
        resizedCanvas.width = width
        resizedCanvas.height = height
        const ctx = resizedCanvas.getContext('2d')
        
        // Draw resized image
        ctx.drawImage(canvas, 0, 0, width, height)
        
        // Compress and return
        const compressedDataUrl = resizedCanvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      } else {
        // Just compress without resizing
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
    } catch (error) {
      reject(new Error(`Canvas compression failed: ${error.message}`))
    }
  })
}

/**
 * Get base64 data from a data URL or image URL
 * @param {string} imageUrl - Data URL or image URL
 * @returns {Promise<string>} - Base64 data (without data URL prefix)
 */
export async function getBase64Data(imageUrl) {
  // If already a data URL, extract base64
  if (imageUrl.startsWith('data:')) {
    const commaIndex = imageUrl.indexOf(',')
    return commaIndex >= 0 ? imageUrl.substring(commaIndex + 1) : imageUrl
  }
  
  // Otherwise, fetch and convert
  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result
        const commaIndex = base64.indexOf(',')
        resolve(commaIndex >= 0 ? base64.substring(commaIndex + 1) : base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error.message}`)
  }
}

