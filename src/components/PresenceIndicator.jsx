import { useCanvasStore } from '../stores/useCanvasStore'
import { useAuth } from '@clerk/clerk-react'

/**
 * Presence Indicator Component
 * 
 * Shows who's currently online and collaborating on the canvas.
 * Displays user count and connection status.
 */
export default function PresenceIndicator() {
  const { userId } = useAuth()
  const onlineUsers = useCanvasStore((state) => state.onlineUsers || [])
  const isConnected = useCanvasStore((state) => state.isConnected)

  // Filter out current user from count
  const otherUsers = onlineUsers.filter((user) => user.userId !== userId)
  const userCount = otherUsers.length

  if (!isConnected) {
    return (
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-xs text-yellow-700">Connecting...</span>
      </div>
    )
  }

  if (userCount === 0) {
    return (
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-stone-200">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-stone-600">You're alone</span>
      </div>
    )
  }

  return (
    <div className="absolute top-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-stone-200">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span className="text-xs text-stone-600">
        {userCount} {userCount === 1 ? 'person' : 'people'} online
      </span>
      {/* Optional: Show user avatars */}
      {otherUsers.length > 0 && otherUsers.length <= 3 && (
        <div className="flex -space-x-2 ml-1">
          {otherUsers.slice(0, 3).map((user) => (
            <div
              key={user.userId}
              className="w-5 h-5 rounded-full bg-stone-300 border-2 border-white flex items-center justify-center text-xs text-stone-600"
              title={user.userName || user.userId}
            >
              {(user.userName || user.userId || '?').charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

