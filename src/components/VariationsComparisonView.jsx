import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function VariationsComparisonView({ projectId, onSelectVariation }) {
  const { userId } = useAuth()
  const [variations, setVariations] = useState([])
  const [selectedVariations, setSelectedVariations] = useState([])
  const [loading, setLoading] = useState(true)
  const [comparisonMode, setComparisonMode] = useState(false)

  useEffect(() => {
    if (projectId && userId) {
      loadVariations()
    }
  }, [projectId, userId])

  const loadVariations = async () => {
    try {
      const response = await fetch(`/api/variations?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setVariations(data.variations || [])
      }
    } catch (error) {
      console.error('Error loading variations:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (variationId) => {
    setSelectedVariations(prev => {
      if (prev.includes(variationId)) {
        return prev.filter(id => id !== variationId)
      } else {
        return [...prev, variationId]
      }
    })
  }

  const markAsSelected = async (variationId) => {
    try {
      const response = await fetch(`/api/variations?variationId=${variationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({ is_selected: true }),
      })

      if (response.ok) {
        loadVariations()
        if (onSelectVariation) {
          const variation = variations.find(v => v.id === variationId)
          if (variation) onSelectVariation(variation)
        }
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

  if (variations.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Design Variations</h3>
          <p className="text-sm text-stone-500 mt-1">{variations.length} variations generated</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              comparisonMode
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {comparisonMode ? 'Exit Compare' : 'Compare Mode'}
          </button>
        </div>
      </div>

      {/* Variations Grid */}
      {comparisonMode && selectedVariations.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          {selectedVariations.map(variationId => {
            const variation = variations.find(v => v.id === variationId)
            if (!variation) return null
            return (
              <div key={variation.id} className="space-y-2">
                <img
                  src={variation.result_url}
                  alt={variation.name}
                  className="w-full rounded-xl border-2 border-stone-200 shadow-lg"
                />
                <p className="text-sm font-medium text-stone-700">{variation.name || 'Untitled'}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {variations.map((variation) => (
            <div
              key={variation.id}
              className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                variation.is_selected
                  ? 'border-stone-900 shadow-lg'
                  : comparisonMode && selectedVariations.includes(variation.id)
                  ? 'border-stone-600 shadow-md'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
              onClick={() => {
                if (comparisonMode) {
                  toggleSelection(variation.id)
                } else {
                  markAsSelected(variation.id)
                }
              }}
            >
              <img
                src={variation.result_url}
                alt={variation.name || 'Variation'}
                className="w-full aspect-square object-cover"
              />
              {variation.is_selected && (
                <div className="absolute top-3 right-3 bg-stone-900 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  Selected
                </div>
              )}
              {comparisonMode && selectedVariations.includes(variation.id) && (
                <div className="absolute top-3 right-3 bg-stone-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                  Selected for Compare
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

      {comparisonMode && (
        <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
          <p className="text-sm text-stone-600">
            Select 2-4 variations to compare side-by-side. Currently selected: {selectedVariations.length}
          </p>
        </div>
      )}
    </div>
  )
}

