import { useState, forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

const LayerItemContent = forwardRef(({ item, isSelected, isHovered, setIsHovered, onSelect, onToggleVisibility, onToggleLock, onOpacityChange, onDelete, dragAttributes, dragListeners, style }, ref) => {
  return (
    <div
      ref={ref}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-stone-50'
        } ${item.is_locked ? 'opacity-60' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(item.id)}
    >
      {/* Drag Handle */}
      <div
        {...dragAttributes}
        {...dragListeners}
        className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded border border-stone-200 overflow-hidden bg-stone-100 flex-shrink-0">
        <img
          src={item.image_url}
          alt={item.name || 'Layer'}
          className="w-full h-full object-cover"
          style={{ opacity: item.opacity || 1 }}
        />
      </div>

      {/* Layer Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-700 truncate">
          {item.name || `Layer ${item.id ? item.id.slice(0, 8) : 'Unknown'}`}
        </div>
        <div className="text-xs text-stone-500">
          {Math.round(item.width || 0)} × {Math.round(item.height || 0)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Visibility Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility(item.id)
          }}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors"
          title={item.is_visible !== false ? 'Hide layer' : 'Show layer'}
        >
          {item.is_visible !== false ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>

        {/* Lock Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock(item.id)
          }}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors"
          title={item.is_locked ? 'Unlock layer' : 'Lock layer'}
        >
          {item.is_locked ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.33-2.5" />
            </svg>
          )}
        </button>

        {/* Delete Button (only on hover) */}
        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
            className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
            title="Delete layer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
})

LayerItemContent.displayName = 'LayerItemContent'

function SortableLayerItem({ item, isSelected, onSelect, onToggleVisibility, onToggleLock, onOpacityChange, onDelete }) {
  const [isHovered, setIsHovered] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <LayerItemContent
      ref={setNodeRef}
      style={style}
      item={item}
      isSelected={isSelected}
      isHovered={isHovered}
      setIsHovered={setIsHovered}
      onSelect={onSelect}
      onToggleVisibility={onToggleVisibility}
      onToggleLock={onToggleLock}
      onOpacityChange={onOpacityChange}
      onDelete={onDelete}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  )
}

function LayerItemExpanded({ item, onOpacityChange, onClose }) {
  return (
    <div className="px-3 py-3 border-t border-stone-200 bg-stone-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-700">Opacity</span>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          value={(item.opacity || 1) * 100}
          onChange={(e) => onOpacityChange(item.id, parseInt(e.target.value) / 100)}
          className="flex-1"
        />
        <span className="text-xs text-stone-600 font-mono w-10 text-right">
          {Math.round((item.opacity || 1) * 100)}%
        </span>
      </div>
    </div>
  )
}

export default function LayersPanel({ items, selectedItemId, onSelectItem, onReorderItems, onToggleVisibility, onToggleLock, onOpacityChange, onDeleteItem, isOpen, onClose }) {
  const [expandedItemId, setExpandedItemId] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sort items by z_index (highest first, so top layer is first in list)
  // Filter out any invalid items (without id) and sort by z_index (descending)
  const sortedItems = Array.isArray(items) 
    ? [...items].filter(item => item && item.id).sort((a, b) => (b.z_index || 0) - (a.z_index || 0)) 
    : []

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex(item => item.id === active.id)
      const newIndex = sortedItems.findIndex(item => item.id === over.id)

      const newOrder = arrayMove(sortedItems, oldIndex, newIndex)

      // Update z_index values (reverse order: first item gets highest z_index)
      const updatedItems = newOrder.map((item, index) => ({
        ...item,
        z_index: newOrder.length - index,
      }))

      onReorderItems(updatedItems)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l border-stone-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
        <h2 className="text-lg font-semibold text-stone-800">Layers</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-stone-100 text-stone-600 hover:text-stone-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-3">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-50">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
            <p className="text-sm">No layers yet</p>
            <p className="text-xs mt-1">Add images to the canvas to see them here</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {sortedItems.map((item) => (
                  <div key={item.id}>
                    <SortableLayerItem
                      item={item}
                      isSelected={selectedItemId === item.id}
                      onSelect={onSelectItem}
                      onToggleVisibility={onToggleVisibility}
                      onToggleLock={onToggleLock}
                      onOpacityChange={(id, opacity) => {
                        onOpacityChange(id, opacity)
                        setExpandedItemId(id === expandedItemId ? null : id)
                      }}
                      onDelete={onDeleteItem}
                    />
                    {expandedItemId === item.id && (
                      <LayerItemExpanded
                        item={item}
                        onOpacityChange={onOpacityChange}
                        onClose={() => setExpandedItemId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
