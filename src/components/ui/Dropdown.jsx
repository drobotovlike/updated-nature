import { useState, useRef, useEffect } from 'react'

export function Dropdown({ trigger, children, align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={`absolute top-full mt-1 ${alignClasses[align]} bg-surface-raised border border-border rounded-sm shadow-lg py-1 min-w-[120px] max-h-60 overflow-y-auto z-50`}
          style={{
            animation: 'fadeInUp 150ms cubic-bezier(0.25, 0.8, 0.25, 1)',
            transform: 'translateY(4px)',
          }}
        >
          <div className="relative">
            {children}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-surface-raised to-transparent pointer-events-none" />
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

