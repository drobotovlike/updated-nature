import { useState, useRef, useEffect } from 'react'

export default function Folder({
  name: initialName = 'Designs',
  color: initialColor = '#9333ea', // Default purple
  itemCount = 0,
  lastUpdated = null,
  onNameChange,
  onColorChange,
  onClick,
  className = '',
}) {
  const [name, setName] = useState(initialName)
  const [isEditing, setIsEditing] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [color, setColor] = useState(initialColor)
  const nameInputRef = useRef(null)
  const colorPickerRef = useRef(null)

  // Update local state when props change
  useEffect(() => {
    setName(initialName)
  }, [initialName])

  useEffect(() => {
    setColor(initialColor)
  }, [initialColor])

  // Close color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditing])

  const handleNameSubmit = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(false)
    if (onNameChange && name.trim() !== initialName) {
      onNameChange(name.trim() || initialName)
    }
  }

  const handleNameBlur = () => {
    setIsEditing(false)
    if (onNameChange && name.trim() !== initialName) {
      onNameChange(name.trim() || initialName)
    }
  }

  const handleColorSelect = (newColor) => {
    setColor(newColor)
    setShowColorPicker(false)
    if (onColorChange) {
      onColorChange(newColor)
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Never'
    const d = new Date(date)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }

  const formatItemCount = (count) => {
    if (count === 0) return 'No items'
    if (count === 1) return '1 item'
    return `${count} items`
  }

  // Generate lighter and darker shades for the glassmorphic effect
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 147, g: 51, b: 234 } // Default purple
  }

  const rgb = hexToRgb(color)
  const rgbaMain = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`
  const rgbaLight = `rgba(${rgb.r + 30}, ${rgb.g + 30}, ${rgb.b + 30}, 0.3)`
  const rgbaDark = `rgba(${rgb.r - 40}, ${rgb.g - 40}, ${rgb.b - 40}, 0.4)`

  const presetColors = [
    '#9333ea', // Purple
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
  ]

  return (
    <div
      className={`relative cursor-pointer group ${className}`}
      onClick={onClick}
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
        style={{
          background: `linear-gradient(135deg, ${rgbaMain} 0%, ${rgbaDark} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${rgbaLight}`,
        }}
      >
        {/* Folder Tab */}
        <div
          className="absolute top-0 left-0 w-16 h-6 rounded-br-lg z-10"
          style={{
            background: `linear-gradient(135deg, ${rgbaLight} 0%, ${rgbaMain} 100%)`,
            borderRight: `1px solid ${rgbaLight}`,
            borderBottom: `1px solid ${rgbaLight}`,
          }}
        />

        {/* Content Container */}
        <div className="p-6 pt-8 relative z-0">
          {/* Header with Info Icon */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <form onSubmit={handleNameSubmit} onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setName(initialName)
                        setIsEditing(false)
                      }
                    }}
                    className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5 text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                    style={{ color: 'white' }}
                  />
                </form>
              ) : (
                <h3
                  className="text-white font-semibold text-lg mb-1 cursor-text hover:opacity-90 transition-opacity"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }}
                  title="Double-click to edit name"
                >
                  {name}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Color Picker Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowColorPicker(!showColorPicker)
                }}
                className="w-6 h-6 rounded-full border-2 border-white/40 hover:border-white/60 transition-colors flex items-center justify-center"
                style={{ backgroundColor: color }}
                title="Change folder color"
              >
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
              </button>
              {/* Info Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // You can add info modal or tooltip here
                }}
                className="w-6 h-6 rounded-full border border-white/40 hover:border-white/60 hover:bg-white/10 transition-colors flex items-center justify-center"
                title="Folder information"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="2 2" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </button>
            </div>
          </div>

          {/* Item Count */}
          <div className="mb-3">
            <p className="text-white/90 text-sm font-medium">{formatItemCount(itemCount)}</p>
          </div>

          {/* Last Updated */}
          <div className="text-white/70 text-xs">
            <p>Last added time {formatDate(lastUpdated)}</p>
          </div>

          {/* Inner Card/Sheet Effect */}
          <div
            className="absolute bottom-4 right-4 w-20 h-16 rounded-lg opacity-20"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(5px)',
            }}
          />
        </div>

        {/* Color Picker Dropdown */}
        {showColorPicker && (
          <div
            ref={colorPickerRef}
            className="absolute top-16 right-2 bg-white rounded-xl shadow-2xl p-4 z-50 border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-stone-700 mb-3">Choose Color</p>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => handleColorSelect(presetColor)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor
                      ? 'border-stone-900 scale-110'
                      : 'border-stone-300 hover:border-stone-500 hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>
            {/* Custom Color Input */}
            <div className="mt-3 pt-3 border-t border-stone-200">
              <label className="block text-xs font-semibold text-stone-700 mb-2">
                Custom Color
              </label>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-full h-8 rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

