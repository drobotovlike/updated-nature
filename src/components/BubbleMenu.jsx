import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'

function BubbleMenuItem({ item }) {
  const [hovered, setHovered] = useState(false)

  const baseStyle = {
    transform: `rotate(${item.rotation || 0}deg)`,
  }

  const hoverStyle =
    hovered && item.hoverStyles
      ? {
          backgroundColor: item.hoverStyles.bgColor,
          color: item.hoverStyles.textColor,
          transform: `rotate(0deg) translateY(-1px)`,
        }
      : {}

  return (
    <li>
      <Link
        to={item.href}
        aria-label={item.ariaLabel || item.label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs md:text-sm font-medium tracking-wide',
          'border border-stone-200/80 bg-white/60 backdrop-blur-sm text-stone-700',
          'shadow-sm hover:shadow-md transition-all duration-200'
        )}
        style={{ ...baseStyle, ...hoverStyle }}
      >
        {item.label}
      </Link>
    </li>
  )
}

export default function BubbleMenu({
  logo,
  items,
  menuAriaLabel = 'Main navigation',
  menuBg = '#ffffff',
  menuContentColor = '#111111',
  useFixedPosition = false,
}) {
  return (
    <nav
      aria-label={menuAriaLabel}
      className={cn(
        'flex items-center gap-4 rounded-full border border-stone-200/80 shadow-lg px-4 py-2',
        'bg-white/90 backdrop-blur-xl',
        useFixedPosition &&
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-full'
      )}
      style={{ backgroundColor: menuBg, color: menuContentColor }}
    >
      {logo && (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-xs font-bold shadow-md">
          {logo}
        </div>
      )}
      <ul className="flex items-center gap-2 md:gap-3">
        {items?.map((item) => (
          <BubbleMenuItem key={item.label} item={item} />
        ))}
      </ul>
    </nav>
  )
}

