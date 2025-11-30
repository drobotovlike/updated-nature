import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useCanvasStore } from '../stores/useCanvasStore'
import { useAuth } from '@clerk/clerk-react'

/**
 * Canvas Realtime Hook
 * 
 * Enables real-time collaboration using Supabase Realtime (PostgreSQL replication).
 * 
 * Features:
 * - Instant sync of canvas items (INSERT, UPDATE, DELETE)
 * - Presence system (who's online)
 * - Multiplayer cursors (optional)
 * - Conflict resolution via last-write-wins
 * 
 * @param {string} projectId - The project ID to sync
 */
export function useCanvasRealtime(projectId) {
  const { userId } = useAuth()
  const channelRef = useRef(null)
  const presenceChannelRef = useRef(null)
  
  // Store selectors
  const items = useCanvasStore((state) => state.items)
  const setItems = useCanvasStore((state) => state.setItems)
  const updateItem = useCanvasStore((state) => state.updateItem)
  const deleteItem = useCanvasStore((state) => state.deleteItem)
  const addItem = useCanvasStore((state) => state.addItem)
  const setOnlineUsers = useCanvasStore((state) => state.setOnlineUsers)
  const setIsConnected = useCanvasStore((state) => state.setIsConnected)

  /**
   * Handle real-time item changes from other users
   */
  const handleItemChange = useCallback((payload) => {
    // Ignore our own changes (they're already in the store)
    if (payload.new?.created_by === userId || payload.old?.created_by === userId) {
      return
    }

    console.log('Realtime item change:', payload.eventType, payload)

    if (payload.eventType === 'INSERT') {
      // Another user created an item
      const newItem = payload.new
      setItems((currentItems) => {
        // Check if item already exists (prevent duplicates)
        const exists = currentItems.some((item) => item.id === newItem.id)
        if (exists) return currentItems
        return [...currentItems, newItem]
      })
    } else if (payload.eventType === 'UPDATE') {
      // Another user updated an item
      const updatedItem = payload.new
      updateItem(updatedItem.id, updatedItem)
    } else if (payload.eventType === 'DELETE') {
      // Another user deleted an item
      const deletedId = payload.old.id
      deleteItem(deletedId)
    }
  }, [userId, setItems, updateItem, deleteItem])

  /**
   * Setup real-time subscription for canvas items
   */
  useEffect(() => {
    if (!projectId || !userId) return

    console.log('Setting up realtime subscription for project:', projectId)

    // Subscribe to canvas_items table changes
    const channel = supabase
      .channel(`canvas-items:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'canvas_items',
          filter: `project_id=eq.${projectId}`
        },
        handleItemChange
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime sync enabled for project:', projectId)
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error')
          setIsConnected(false)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      console.log('Cleaning up realtime subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setIsConnected(false)
      }
    }
  }, [projectId, userId, handleItemChange, setIsConnected])

  /**
   * Setup presence system (who's online)
   */
  useEffect(() => {
    if (!projectId || !userId) return

    const presenceChannel = supabase
      .channel(`presence:${projectId}`, {
        config: {
          presence: {
            key: userId, // User ID as presence key
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const onlineUsers = Object.keys(state).map((userId) => ({
          userId,
          ...state[userId][0], // Get first presence entry
        }))
        if (setOnlineUsers) {
          setOnlineUsers(onlineUsers)
        }
        console.log('Online users:', onlineUsers)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our presence
          await presenceChannel.track({
            userId,
            online_at: new Date().toISOString(),
          })
        }
      })

    presenceChannelRef.current = presenceChannel

    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack()
        supabase.removeChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
    }
  }, [projectId, userId, setOnlineUsers, setIsConnected])

  const isConnected = useCanvasStore((state) => state.isConnected)
  const onlineUsers = useCanvasStore((state) => state.onlineUsers || [])

  return {
    isConnected,
    onlineUsers,
  }
}

export default useCanvasRealtime

