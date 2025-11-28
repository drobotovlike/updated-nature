import { useEffect } from 'react'

export function useCanvasHotkeys({
  selectedItemId,
  onUndo,
  onRedo,
  onDelete,
  onCopy,
  onPaste,
  onStyleTransfer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      // Undo: Cmd/Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        onUndo?.()
        return
      }

      // Redo: Cmd/Ctrl+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        onRedo?.()
        return
      }

      // Delete: Backspace or Delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedItemId) {
        e.preventDefault()
        onDelete?.(selectedItemId)
        return
      }

      // Copy: Cmd/Ctrl+C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedItemId) {
        e.preventDefault()
        onCopy?.(selectedItemId)
        return
      }

      // Paste: Cmd/Ctrl+V
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Paste is usually handled by the 'paste' event, but we can trigger it here if needed
        // For now, we'll let the native paste event handler in CanvasView take care of it
        // onPaste?.() 
        return
      }

      // Style transfer: Cmd/Ctrl+T
      if ((e.metaKey || e.ctrlKey) && e.key === 't' && !e.shiftKey && selectedItemId) {
        e.preventDefault()
        onStyleTransfer?.(selectedItemId)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedItemId, onUndo, onRedo, onDelete, onCopy, onPaste, onStyleTransfer])
}
