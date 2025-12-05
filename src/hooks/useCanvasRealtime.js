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
    // Check both created_by and user_id fields for INSERT/UPDATE
    // For UPDATE, also check if the updated item already has our recent changes
    const isOurChange = 
      (payload.new?.created_by === userId || payload.new?.user_id === userId) ||
      (payload.old?.created_by === userId || payload.old?.user_id === userId)
    
    if (isOurChange) {
      console.log('Ignoring our own change in realtime:', payload.eventType)
      return
    }

    // For UPDATE events, check if local item has been edited (e.g., inpainting)
    // to prevent overwriting optimistic updates or recent edits
    if (payload.eventType === 'UPDATE') {
      const updatedItem = payload.new
      const currentItems = items
      const localItem = currentItems.find(item => item.id === updatedItem.id)
      
      if (localItem) {
        // If local item has edit metadata (from inpainting or other AI edits),
        // always preserve the edited image_url to prevent reverting changes
        if (localItem.metadata?.edit_type && localItem.metadata?.edited_at && localItem.image_url) {
          // Check if the remote update would overwrite our edited image
          if (updatedItem.image_url !== localItem.image_url) {
            // The remote update has a different image_url - this could be reverting our edit
            // Only allow this if the remote also has the same edit metadata (meaning it's our update coming back)
            if (!updatedItem.metadata?.edit_type || updatedItem.metadata?.edited_at !== localItem.metadata?.edited_at) {
              // This is not our update coming back - skip it to preserve the edit
              console.log('Skipping realtime update that would overwrite local edit:', updatedItem.id)
              return
            }
          }
        }
      }
    }

    console.log('Realtime item change from another user:', payload.eventType, payload)

    if (payload.eventType === 'INSERT') {
      // Another user created an item
      const newItem = payload.new
      setItems((currentItems) => {
        // Check if item already exists (prevent duplicates)
        const exists = currentItems.some((item) => item.id === newItem.id)
        if (exists) {
          console.log('Item already exists, skipping duplicate:', newItem.id)
          return currentItems
        }
        return [...currentItems, newItem]
      })
    } else if (payload.eventType === 'UPDATE') {
      // Another user updated an item
      const updatedItem = payload.new
      // Only update if item exists in our store
      setItems((currentItems) => {
        const exists = currentItems.some((item) => item.id === updatedItem.id)
        if (!exists) {
          console.log('Item not found in store, skipping update:', updatedItem.id)
          return currentItems
        }
        // Merge the update instead of replacing - preserve local optimistic updates
        return currentItems.map((item) => {
          if (item.id === updatedItem.id) {
            // Check if local item has been edited (has edit metadata)
            // If so, preserve the edited image_url to prevent reverting inpainting changes
            if (item.metadata?.edit_type && item.metadata?.edited_at && item.image_url) {
              // This item was recently edited (e.g., inpainting) - preserve the edited image_url
              // Only allow overwriting if the remote update also has the same edit metadata
              const remoteHasSameEdit = 
                updatedItem.metadata?.edit_type === item.metadata?.edit_type &&
                updatedItem.metadata?.edited_at === item.metadata?.edited_at &&
                updatedItem.image_url === item.image_url
              
              if (!remoteHasSameEdit) {
                // Remote doesn't have the same edit - preserve local edit
                // Merge everything except image_url and edit metadata
                const { image_url: localImageUrl, metadata: localMetadata, ...localRest } = item
                const { image_url: remoteImageUrl, metadata: remoteMetadata, ...remoteRest } = updatedItem
                
                return {
                  ...localRest,
                  ...remoteRest,
                  image_url: localImageUrl, // Preserve edited image
                  metadata: {
                    ...localMetadata,
                    ...remoteMetadata,
                    // Keep edit metadata
                    edit_type: localMetadata.edit_type,
                    edited_at: localMetadata.edited_at,
                    original_image_url: localMetadata.original_image_url,
                  },
                }
              }
              // Remote has the same edit - safe to merge normally (this is our update coming back)
            }
            
            // No recent edits - safe to merge normally
            const mergedItem = { ...item, ...updatedItem }
            
            // Preserve local metadata if it exists
            if (item.metadata && updatedItem.metadata) {
              mergedItem.metadata = { ...item.metadata, ...updatedItem.metadata }
            } else if (item.metadata) {
              mergedItem.metadata = item.metadata
            }
            
            return mergedItem
          }
          return item
        })
      })
    } else if (payload.eventType === 'DELETE') {
      // Another user deleted an item
      const deletedId = payload.old?.id
      if (deletedId) {
        setItems((currentItems) => {
          // Only delete if item exists
          const exists = currentItems.some((item) => item.id === deletedId)
          if (!exists) {
            console.log('Item not found in store, skipping delete:', deletedId)
            return currentItems
          }
          return currentItems.filter((item) => item.id !== deletedId)
        })
      }
    }
  }, [userId, setItems])

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

