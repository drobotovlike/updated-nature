import { useState, useRef, useEffect } from 'react'
import { useCanvasStore } from '../stores/useCanvasStore'

/**
 * AI Prompt Modal
 * 
 * A professional, focused modal for AI generation.
 * Appears when user draws a selection area in generate mode or clicks the AI button.
 */
export default function AIPromptModal({ onGenerate, onClose, isGenerating }) {
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('realistic')
  const inputRef = useRef(null)
  
  const aiSelectionBounds = useCanvasStore((state) => state.aiSelectionBounds)
  const closeAIPrompt = useCanvasStore((state) => state.closeAIPrompt)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
        handleGenerate()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prompt])

  const handleClose = () => {
    closeAIPrompt()
    onClose?.()
  }

  const handleGenerate = () => {
    if (!prompt.trim()) return
    onGenerate?.({
      prompt: prompt.trim(),
      style: selectedStyle,
      bounds: aiSelectionBounds
    })
  }

  const styleOptions = [
    { id: 'realistic', label: 'Photorealistic', icon: '📷' },
    { id: 'modern', label: 'Modern', icon: '🏢' },
    { id: 'minimalist', label: 'Minimalist', icon: '◻️' },
    { id: 'scandinavian', label: 'Scandinavian', icon: '🌿' },
    { id: 'industrial', label: 'Industrial', icon: '🏭' },
    { id: 'bohemian', label: 'Bohemian', icon: '🎨' },
  ]

  const quickPrompts = [
    'Add a mid-century modern armchair',
    'Place a minimalist coffee table',
    'Add indoor plants near the window',
    'Put a cozy area rug',
    'Add a floor lamp with warm lighting',
    'Place a modern bookshelf',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Generate with AI</h2>
              <p className="text-sm text-stone-500">Describe what you'd like to add</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              What would you like to generate?
            </label>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Add a comfortable velvet sofa with throw pillows..."
              className="w-full h-24 px-4 py-3 text-stone-900 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
            />
          </div>

          {/* Quick Prompts */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Quick suggestions
            </label>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((qp) => (
                <button
                  key={qp}
                  onClick={() => setPrompt(qp)}
                  className="px-3 py-1.5 text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors"
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {styleOptions.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                    selectedStyle === style.id
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-stone-200 hover:border-stone-300 text-stone-600'
                  }`}
                >
                  <span>{style.icon}</span>
                  <span className="text-sm font-medium">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selection Area Info */}
          {aiSelectionBounds && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span className="text-sm text-blue-700">
                Generating in selected area ({Math.round(aiSelectionBounds.width)} × {Math.round(aiSelectionBounds.height)} px)
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-t border-stone-100">
          <div className="text-xs text-stone-500">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-stone-600">Enter</kbd> to generate
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

