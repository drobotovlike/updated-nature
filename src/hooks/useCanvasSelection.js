import { useState, useCallback } from 'react'

export function useCanvasSelection() {
    const [selectedItemId, setSelectedItemId] = useState(null)
    const [selectedItemIds, setSelectedItemIds] = useState(new Set())

    const handleSelect = useCallback((e, itemId, isMultiSelect = false) => {
        // If e is provided, stop propagation to prevent stage click clearing selection
        if (e && e.cancelBubble !== undefined) {
            e.cancelBubble = true
        }

        if (isMultiSelect) {
            setSelectedItemIds((prev) => {
                const newSet = new Set(prev)
                if (newSet.has(itemId)) {
                    newSet.delete(itemId)
                } else {
                    newSet.add(itemId)
                }

                // Update primary selected item
                // If we just added an item, it becomes the primary one
                // If we removed the primary one, pick another from the set or null
                if (newSet.has(itemId)) {
                    setSelectedItemId(itemId)
                } else if (itemId === selectedItemId) {
                    const nextId = newSet.size > 0 ? Array.from(newSet)[newSet.size - 1] : null
                    setSelectedItemId(nextId)
                }

                return newSet
            })
        } else {
            // Single select
            setSelectedItemId(itemId)
            setSelectedItemIds(new Set([itemId]))
        }
    }, [selectedItemId])

    const clearSelection = useCallback(() => {
        setSelectedItemId(null)
        setSelectedItemIds(new Set())
    }, [])

    return {
        selectedItemId,
        selectedItemIds,
        setSelectedItemId,
        setSelectedItemIds,
        handleSelect,
        clearSelection
    }
}
