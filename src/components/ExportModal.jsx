import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function ExportModal({ projectId, projectName, onClose }) {
  const { userId } = useAuth()
  const [format, setFormat] = useState('png')
  const [resolution, setResolution] = useState('4k')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          projectId,
          format,
          resolution,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const data = await response.json()

      // Download file
      const link = document.createElement('a')
      link.href = data.url
      link.download = data.filename || `${projectName}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onClose()
    } catch (error) {
      console.error('Export error:', error)
      alert(`Failed to export: ${error.message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-stone-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-stone-900 font-serif-ature">Export Design</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-stone-700">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
            >
              <option value="png">PNG Image</option>
              <option value="jpg">JPG Image</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-stone-700">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
            >
              <option value="original">Original</option>
              <option value="2k">2K (2048x2048)</option>
              <option value="4k">4K (4096x4096)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-lg"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

