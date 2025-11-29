import { useState, useEffect } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { getAuthToken } from '../utils/authToken'

export default function VariationsView({ projectId, onSelectVariation }) {
  const { userId } = useAuth()
  const clerk = useClerk()
  const [variations, setVariations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (projectId && userId && clerk?.session) {
      loadVariations()
    }
  }, [projectId, userId, clerk])

  const loadVariations = async () => {
    try {
      const token = await getAuthToken(clerk)
      if (!token) return

      const response = await fetch(`/api/projects?action=variations&projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVariations(data.variations || [])
        const selected = data.variations?.find(v => v.is_selected)
        if (selected) setSelectedId(selected.id)
      }
    } catch (error) {
      console.error('Error loading variations:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsSelected = async (variationId) => {
    try {
      const token = await getAuthToken(clerk)
      if (!token) return

      const response = await fetch(`/api/projects?action=variations&variationId=${variationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ is_selected: true }),
      })

      if (response.ok) {
        setSelectedId(variationId)
        loadVariations()
      }
    } catch (error) {
      console.error('Error marking as selected:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Design Variations</h3>
          <p className="text-sm text-stone-500 mt-1">{variations.length} variations generated</p>
        </div>
      </div>

      {variations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <p className="text-stone-500 font-medium mb-1">No variations yet</p>
          <p className="text-sm text-stone-400">Generate multiple designs to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {variations.map((variation) => (
            <div
              key={variation.id}
              className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                selectedId === variation.id
                  ? 'border-stone-900 shadow-lg'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
              onClick={() => {
                setSelectedId(variation.id)
                markAsSelected(variation.id)
                if (onSelectVariation) onSelectVariation(variation)
              }}
            >
              <img
                src={variation.result_url}
                alt={variation.name || 'Variation'}
                className="w-full aspect-square object-cover"
              />
              {selectedId === variation.id && (
                <div className="absolute top-3 right-3 bg-stone-900 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  Selected
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <p className="text-sm font-medium text-white">{variation.name || 'Untitled Variation'}</p>
                <p className="text-xs text-stone-300 mt-1">
                  {new Date(variation.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

