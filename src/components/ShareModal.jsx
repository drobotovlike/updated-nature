import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function ShareModal({ projectId, creationId, onClose }) {
  const { userId } = useAuth()
  const [accessType, setAccessType] = useState('view')
  const [expiresAt, setExpiresAt] = useState('')
  const [password, setPassword] = useState('')
  const [shareLink, setShareLink] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createShareLink = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/sharing?projectId=${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          projectId,
          creationId,
          accessType,
          expiresAt: expiresAt || null,
          password: password || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create share link')
      }

      const link = await response.json()
      setShareLink(link)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    const url = `${window.location.origin}/share/${shareLink.token}`
    navigator.clipboard.writeText(url)
    // Show success message
    alert('Link copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-stone-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-stone-900 font-serif-ature">Share Project</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        {!shareLink ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">Access Type</label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
                >
                  <option value="view">View Only</option>
                  <option value="comment">View & Comment</option>
                  <option value="edit">View, Comment & Edit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-stone-700">Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
                  placeholder="Set password protection"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createShareLink}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-lg"
              >
                {loading ? 'Creating...' : 'Create Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/share/${shareLink.token}`}
                    readOnly
                    className="flex-1 p-3 border border-stone-200 rounded-lg bg-stone-50 text-sm text-stone-700"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold transition-colors shadow-lg"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="text-sm text-stone-600 space-y-1 bg-stone-50 rounded-lg p-3 border border-stone-200">
                <p className="font-medium">Access Type: <span className="font-normal capitalize">{shareLink.access_type}</span></p>
                {shareLink.expires_at && (
                  <p>Expires: {new Date(shareLink.expires_at).toLocaleString()}</p>
                )}
                {shareLink.password_hash && (
                  <p>Password Protected: Yes</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold transition-colors shadow-lg"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

