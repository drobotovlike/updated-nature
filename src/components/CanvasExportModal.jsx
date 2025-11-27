import { useState } from 'react'
import html2canvas from 'html2canvas'
import { PDFDocument, rgb } from 'pdf-lib'

export default function CanvasExportModal({ items, selectedItemIds, stageRef, dimensions, canvasState, onClose }) {
  const [exportFormat, setExportFormat] = useState('png')
  const [exporting, setExporting] = useState(false)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeWatermark, setIncludeWatermark] = useState(false)

  const getSelectedItems = () => {
    if (selectedItemIds && selectedItemIds.size > 0) {
      return items.filter(item => selectedItemIds.has(item.id))
    }
    return items.filter(item => item.is_visible !== false)
  }

  const calculateBoundingBox = (itemsToExport) => {
    if (itemsToExport.length === 0) {
      return { x: 0, y: 0, width: dimensions.width, height: dimensions.height }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    itemsToExport.forEach(item => {
      const left = item.x_position
      const right = item.x_position + (item.width || 0)
      const top = item.y_position
      const bottom = item.y_position + (item.height || 0)

      minX = Math.min(minX, left)
      minY = Math.min(minY, top)
      maxX = Math.max(maxX, right)
      maxY = Math.max(maxY, bottom)
    })

    // Add padding
    const padding = 20
    return {
      x: Math.max(0, minX - padding),
      y: Math.max(0, minY - padding),
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    }
  }

  const generateFileName = (extension) => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `canvas-export-${month}-${day}-${hours}-${minutes}.${extension}`
  }

  const exportAsPNG = async () => {
    setExporting(true)
    try {
      const itemsToExport = getSelectedItems()
      if (itemsToExport.length === 0) {
        alert('No items to export')
        return
      }

      const stage = stageRef.current
      if (!stage) {
        alert('Canvas not available')
        return
      }

      const bbox = calculateBoundingBox(itemsToExport)
      
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = bbox.width
      exportCanvas.height = bbox.height
      const ctx = exportCanvas.getContext('2d')

      // Draw background
      ctx.fillStyle = canvasState.backgroundColor || '#fafaf9'
      ctx.fillRect(0, 0, bbox.width, bbox.height)

      // Draw grid if enabled
      if (canvasState.gridEnabled) {
        const gridSize = canvasState.gridSize || 20
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.lineWidth = 1
        for (let x = 0; x <= bbox.width; x += gridSize) {
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, bbox.height)
          ctx.stroke()
        }
        for (let y = 0; y <= bbox.height; y += gridSize) {
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(bbox.width, y)
          ctx.stroke()
        }
      }

      // Draw items
      for (const item of itemsToExport) {
        if (item.is_visible === false) continue

        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          img.onload = () => {
            const x = item.x_position - bbox.x
            const y = item.y_position - bbox.y
            const width = item.width || 400
            const height = item.height || 400
            const opacity = item.opacity || 1

            ctx.save()
            ctx.globalAlpha = opacity
            ctx.translate(x + width / 2, y + height / 2)
            ctx.rotate((item.rotation || 0) * Math.PI / 180)
            ctx.drawImage(img, -width / 2, -height / 2, width, height)
            ctx.restore()
            resolve()
          }
          img.onerror = reject
          img.src = item.image_url
        })
      }

      // Add watermark if enabled
      if (includeWatermark) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.font = '12px Arial'
        ctx.textAlign = 'right'
        ctx.fillText('Created with ATURE Studio', bbox.width - 10, bbox.height - 10)
      }

      // Add metadata if enabled
      if (includeMetadata) {
        const metadata = {
          exportedAt: new Date().toISOString(),
          itemCount: itemsToExport.length,
          canvasSize: { width: bbox.width, height: bbox.height },
        }
        // Embed as comment (not visible but accessible)
        exportCanvas.setAttribute('data-metadata', JSON.stringify(metadata))
      }

      // Download
      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = generateFileName('png')
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    } catch (error) {
      console.error('Error exporting PNG:', error)
      alert('Failed to export PNG. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const exportAsPDF = async () => {
    setExporting(true)
    try {
      const itemsToExport = getSelectedItems()
      if (itemsToExport.length === 0) {
        alert('No items to export')
        return
      }

      const bbox = calculateBoundingBox(itemsToExport)
      
      // Create PDF
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([bbox.width, bbox.height])

      // Draw background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: bbox.width,
        height: bbox.height,
        color: rgb(0.98, 0.98, 0.98), // #fafaf9
      })

      // Draw items (simplified - PDF doesn't support all image transformations easily)
      // For now, we'll export as a single image embedded in PDF
      const stage = stageRef.current
      if (stage) {
        // Get stage as image
        const dataURL = stage.toDataURL({ pixelRatio: 2 })
        const img = await pdfDoc.embedPng(dataURL)
        
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: bbox.width,
          height: bbox.height,
        })
      }

      // Add watermark if enabled
      if (includeWatermark) {
        page.drawText('Created with ATURE Studio', {
          x: bbox.width - 150,
          y: 20,
          size: 12,
          color: rgb(0.7, 0.7, 0.7),
        })
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateFileName('pdf')
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const exportAsSVG = async () => {
    setExporting(true)
    try {
      const itemsToExport = getSelectedItems()
      if (itemsToExport.length === 0) {
        alert('No items to export')
        return
      }

      const bbox = calculateBoundingBox(itemsToExport)
      
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="0 0 ${bbox.width} ${bbox.height}">`
      
      // Background
      svg += `<rect width="${bbox.width}" height="${bbox.height}" fill="${canvasState.backgroundColor || '#fafaf9'}" />`
      
      // Grid if enabled
      if (canvasState.gridEnabled) {
        const gridSize = canvasState.gridSize || 20
        for (let x = 0; x <= bbox.width; x += gridSize) {
          svg += `<line x1="${x}" y1="0" x2="${x}" y2="${bbox.height}" stroke="rgba(0,0,0,0.1)" stroke-width="1" />`
        }
        for (let y = 0; y <= bbox.height; y += gridSize) {
          svg += `<line x1="0" y1="${y}" x2="${bbox.width}" y2="${y}" stroke="rgba(0,0,0,0.1)" stroke-width="1" />`
        }
      }

      // Items as images
      for (const item of itemsToExport) {
        if (item.is_visible === false) continue

        const x = item.x_position - bbox.x
        const y = item.y_position - bbox.y
        const width = item.width || 400
        const height = item.height || 400
        const rotation = item.rotation || 0
        const opacity = item.opacity || 1

        svg += `<g transform="translate(${x + width / 2}, ${y + height / 2}) rotate(${rotation})" opacity="${opacity}">`
        svg += `<image href="${item.image_url}" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" />`
        svg += `</g>`
      }

      // Watermark
      if (includeWatermark) {
        svg += `<text x="${bbox.width - 10}" y="${bbox.height - 10}" text-anchor="end" fill="rgba(0,0,0,0.3)" font-size="12" font-family="Arial">Created with ATURE Studio</text>`
      }

      svg += '</svg>'

      // Download
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = generateFileName('svg')
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting SVG:', error)
      alert('Failed to export SVG. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleExport = async () => {
    switch (exportFormat) {
      case 'png':
        await exportAsPNG()
        break
      case 'pdf':
        await exportAsPDF()
        break
      case 'svg':
        await exportAsSVG()
        break
    }
  }

  const selectedCount = selectedItemIds?.size || 0
  const totalVisible = items.filter(item => item.is_visible !== false).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-200">
          <h2 className="text-xl font-semibold text-stone-800">Export Canvas</h2>
          <p className="text-sm text-stone-500 mt-1">
            {selectedCount > 0 
              ? `Exporting ${selectedCount} selected item${selectedCount > 1 ? 's' : ''}`
              : `Exporting all ${totalVisible} visible item${totalVisible !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {['png', 'pdf', 'svg'].map((format) => (
                <button
                  key={format}
                  onClick={() => setExportFormat(format)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    exportFormat === format
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-stone-700">Include metadata</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeWatermark}
                onChange={(e) => setIncludeWatermark(e.target.checked)}
                className="rounded border-stone-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-stone-700">Include watermark</span>
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 rounded-lg transition-colors"
            disabled={exporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

