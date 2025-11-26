import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

export default function SharedView() {
  const { token } = useParams()
  const [link, setLink] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSharedLink()
  }, [token])

  const loadSharedLink = async () => {
    try {
      const response = await fetch(`/api/sharing?token=${token}`)
      
      if (response.status === 401 || response.status === 403) {
        setPasswordRequired(true)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load shared link' }))
        throw new Error(errorData.error || 'Failed to load shared link')
      }

      const linkData = await response.json()
      setLink(linkData)
      loadComments()
    } catch (error) {
      console.error('Error loading shared link:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/sharing?action=comments&token=${token}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch('/api/sharing?action=comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkToken: token,
          content: newComment,
        }),
      })

      if (response.ok) {
        const comment = await response.json()
        setComments([...comments, comment])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Password Required</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            placeholder="Enter password"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                loadSharedLink()
              }
            }}
          />
          <button
            onClick={loadSharedLink}
            className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
          >
            Access
          </button>
        </div>
      </div>
    )
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <h2 className="text-xl font-semibold mb-2">Link Not Found</h2>
          <p className="text-stone-600">{error || 'This shared link may have expired or been deleted.'}</p>
        </div>
      </div>
    )
  }

  const project = link.projects
  const resultUrl = project?.workflow?.result?.url || project?.workflow?.resultUrl

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-stone-900 font-serif-ature mb-2">{project?.name}</h1>
          <p className="text-sm text-stone-500">Shared design visualization</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {resultUrl ? (
              <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-xl bg-white">
                <img
                  src={resultUrl}
                  alt="Shared design"
                  className="w-full"
                />
              </div>
            ) : (
              <div className="w-full aspect-square bg-stone-200 rounded-2xl flex items-center justify-center border border-stone-200">
                <p className="text-stone-500">No image available</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
              <h3 className="font-semibold mb-3 text-stone-900">Comments</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {comments.length === 0 ? (
                  <p className="text-sm text-stone-500 text-center py-4">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-stone-50 rounded-lg border border-stone-100">
                      <p className="font-medium text-sm text-stone-900">{comment.user_name || 'Anonymous'}</p>
                      <p className="text-sm text-stone-600 mt-1">{comment.content}</p>
                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {link.access_type !== 'view' && (
              <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-stone-200 rounded-lg mb-3 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 resize-none"
                  rows={3}
                />
                <button
                  onClick={addComment}
                  className="w-full px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold transition-colors shadow-lg"
                >
                  Post Comment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

