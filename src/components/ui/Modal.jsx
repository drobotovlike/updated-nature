import { useEffect } from 'react'
import { SquircleClip } from './SquircleClip'

export function Modal({ isOpen, onClose, children, title, 'aria-label': ariaLabel }) {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <SquircleClip />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-macro ease-apple"
          style={{ animation: 'fadeIn 150ms cubic-bezier(0.25, 0.8, 0.25, 1)' }}
        />
        <div
          className="relative bg-surface-base border border-border rounded-lg shadow-lg p-4 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto squircle"
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: 'scaleIn 200ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          }}
        >
          {title && (
            <h2 className="text-lg font-semibold text-text-primary mb-4">{title}</h2>
          )}
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}

