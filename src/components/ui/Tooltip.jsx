import { useState } from 'react'

export function Tooltip({ children, content, delay = 400 }) {
  const [visible, setVisible] = useState(false)
  let timeout

  const show = () => {
    timeout = setTimeout(() => setVisible(true), delay)
  }

  const hide = () => {
    clearTimeout(timeout)
    setVisible(false)
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          className="absolute z-50 px-2 py-2 text-xs text-text-primary bg-surface-raised rounded-sm shadow-lg pointer-events-none whitespace-nowrap transition-opacity duration-micro ease-apple"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
          }}
          role="tooltip"
        >
          {content}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-surface-raised"
          />
        </div>
      )}
    </div>
  )
}

