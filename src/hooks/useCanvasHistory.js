import { useState, useCallback } from 'react'

export function useCanvasHistory(initialItems = []) {
    const [history, setHistory] = useState([initialItems])
    const [historyIndex, setHistoryIndex] = useState(0)

    const addToHistory = useCallback((newItems) => {
        setHistory((prev) => {
            // Remove any future history if we were in the middle of the stack
            const newHistory = prev.slice(0, historyIndex + 1)
            // Limit history size to 50 steps
            if (newHistory.length >= 50) {
                newHistory.shift()
            }
            return [...newHistory, newItems]
        })
        setHistoryIndex((prev) => {
            const newIndex = prev + 1
            return newIndex >= 50 ? 49 : newIndex
        })
    }, [historyIndex])

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            return history[newIndex]
        }
        return null
    }, [history, historyIndex])

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1
            setHistoryIndex(newIndex)
            return history[newIndex]
        }
        return null
    }, [history, historyIndex])

    const canUndo = historyIndex > 0
    const canRedo = historyIndex < history.length - 1

    return {
        history,
        historyIndex,
        addToHistory,
        undo,
        redo,
        canUndo,
        canRedo
    }
}
