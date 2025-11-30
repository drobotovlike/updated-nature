import { useState, useRef, useEffect } from 'react'

/**
 * AI Chat Bar Component
 * Inspired by blocks.so design - clean, minimal AI chat interface
 */
export default function AIChatBar({ 
  onSubmit, 
  isLoading = false,
  placeholder = "Ask AI to generate or modify your design..."
}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`
    }
  }, [input])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    onSubmit(input.trim())
    setInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <form 
        onSubmit={handleSubmit}
        className="flex items-end gap-2 bg-white rounded-lg border border-border shadow-sm p-3 focus-within:shadow-md focus-within:border-primary-400/50 transition-all"
      >
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none border-none focus:outline-none focus:ring-0 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary overflow-y-auto leading-relaxed"
            style={{
              minHeight: '24px',
              maxHeight: '128px',
            }}
          />
        </div>
        
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-400 hover:bg-primary-300 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400/20 shrink-0 shadow-sm hover:shadow"
          title="Send message"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}

