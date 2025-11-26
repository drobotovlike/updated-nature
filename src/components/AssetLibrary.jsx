import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { getAssets, addAssetToLibrary } from '../utils/projectManager'
import { uploadFileToCloud } from '../utils/cloudProjectManager'

export default function AssetLibrary({ onSelectAsset, projectId }) {
  const { userId } = useAuth()
  const [assets, setAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingAsset, setUploadingAsset] = useState(false)
  const assetUploadInputRef = useRef(null)

  useEffect(() => {
    if (userId) {
      loadAssets()
      loadTags()
    }
  }, [userId, searchQuery, selectedTags])

  const loadAssets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTags.length > 0) {
        selectedTags.forEach(tag => params.append('tags', tag))
      }

      const response = await fetch(`/api/assets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
      }
    } catch (error) {
      console.error('Error loading assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTags = async () => {
    try {
      const response = await fetch('/api/assets?action=tags', {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const handleAssetUpload = async (file) => {
    if (!file || !userId) return

    setUploadingAsset(true)
    try {
      const uploadResult = await uploadFileToCloud(file, userId)
      const permanentUrl = uploadResult.url

      if (!permanentUrl) {
        throw new Error('Upload succeeded but no URL returned')
      }

      await addAssetToLibrary(
        userId,
        file.name,
        permanentUrl,
        'image',
        `Uploaded from asset library`
      )

      loadAssets()
    } catch (error) {
      console.error('Error uploading asset:', error)
      alert('Failed to upload asset')
    } finally {
      setUploadingAsset(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Upload */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
          />
        </div>
        <button
          onClick={() => assetUploadInputRef.current?.click()}
          disabled={uploadingAsset}
          className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {uploadingAsset ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={assetUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleAssetUpload(file)
          }
          e.target.value = ''
        }}
      />

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags(
                  selectedTags.includes(tag)
                    ? selectedTags.filter(t => t !== tag)
                    : [...selectedTags, tag]
                )
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Assets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin"></div>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <p className="text-stone-500 font-medium mb-1">No assets found</p>
          <p className="text-sm text-stone-400">Upload assets to build your library</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group cursor-pointer hover:border-stone-300 transition-all relative"
              onClick={() => {
                if (onSelectAsset) {
                  onSelectAsset(asset)
                }
              }}
            >
              <img
                src={asset.url}
                alt={asset.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs truncate font-medium">{asset.name}</p>
                {asset.description && (
                  <p className="text-[10px] text-stone-300 truncate mt-0.5">{asset.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

