import { useState, useRef, useEffect } from 'react'

export default function CompareMode({ items, splitPosition, onSplitChange, onClose }) {
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  const handleMouseDown = (e) => {
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100
      const clamped = Math.max(5, Math.min(95, percentage))
      onSplitChange(clamped)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onSplitChange])

  if (items.length < 2) return null

  const [item1, item2] = items

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-stone-200 flex items-center gap-4">
        <span className="text-sm text-stone-700">Compare Mode</span>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-stone-600 text-white rounded hover:bg-stone-700 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Comparison View */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* Left Image */}
        <div
          className="absolute inset-0"
          style={{
            width: `${splitPosition}%`,
            overflow: 'hidden',
          }}
        >
          <img
            src={item1.image_url}
            alt={item1.name || 'Image 1'}
            className="w-full h-full object-contain"
            style={{ objectPosition: 'left center' }}
          />
        </div>

        {/* Right Image */}
        <div
          className="absolute inset-0"
          style={{
            left: `${splitPosition}%`,
            width: `${100 - splitPosition}%`,
            overflow: 'hidden',
          }}
        >
          <img
            src={item2.image_url}
            alt={item2.name || 'Image 2'}
            className="w-full h-full object-contain"
            style={{ objectPosition: 'right center' }}
          />
        </div>

        {/* Splitter */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-col-resize z-20 flex items-center justify-center"
          style={{ left: `${splitPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
        >
          <div className="w-8 h-16 bg-white/90 rounded-full shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

