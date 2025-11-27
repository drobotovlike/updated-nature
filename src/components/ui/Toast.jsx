import { useEffect, useState, useRef } from 'react'

export function Toast({ message, type = 'info', onDismiss, duration = 6000 }) {
  const [isVisible, setIsVisible] = useState(true)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onDismiss, 150)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
    setSwipeOffset(0)
  }

  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - touchStartX.current
    if (deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, 200))
    }
  }

  const handleTouchEnd = () => {
    if (swipeOffset >= 80) {
      setIsVisible(false)
      setTimeout(onDismiss, 150)
    } else {
      setSwipeOffset(0)
    }
  }

  const typeColors = {
    info: 'bg-surface-elevated text-text-primary',
    success: 'bg-success-400 text-background-base',
    error: 'bg-error-400 text-background-base',
    warning: 'bg-warning-400 text-background-base',
  }

  if (!isVisible && swipeOffset === 0) return null

  return (
    <div
      className={`${typeColors[type]} px-2 py-2 text-xs rounded-sm shadow-lg min-w-[200px] max-w-sm transition-all duration-micro ease-apple`}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity: isVisible ? 1 : 0,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="alert"
    >
      {message}
    </div>
  )
}

