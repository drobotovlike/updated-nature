import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function ProjectMetadataForm({ projectId, onSave }) {
  const { userId } = useAuth()
  const [metadata, setMetadata] = useState({
    description: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    room_type: '',
    room_measurements: { width: '', height: '', length: '', unit: 'ft' },
    budget: '',
    deadline: '',
    tags: [],
    notes: '',
  })
  const [newTag, setNewTag] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectId && userId) {
      loadMetadata()
    }
  }, [projectId, userId])

  const loadMetadata = async () => {
    try {
      const response = await fetch(`/api/projects/metadata?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data) {
          setMetadata({
            description: data.description || '',
            client_name: data.client_name || '',
            client_email: data.client_email || '',
            client_phone: data.client_phone || '',
            room_type: data.room_type || '',
            room_measurements: data.room_measurements || { width: '', height: '', length: '', unit: 'ft' },
            budget: data.budget || '',
            deadline: data.deadline || '',
            tags: data.tags || [],
            notes: data.notes || '',
          })
        }
      }
    } catch (error) {
      console.error('Error loading metadata:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/metadata?projectId=${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify(metadata),
      })

      if (response.ok) {
        if (onSave) onSave()
        alert('Metadata saved successfully!')
      }
    } catch (error) {
      console.error('Error saving metadata:', error)
      alert('Failed to save metadata')
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !metadata.tags.includes(newTag.trim())) {
      setMetadata({
        ...metadata,
        tags: [...metadata.tags, newTag.trim()],
      })
      setNewTag('')
    }
  }

  const removeTag = (tag) => {
    setMetadata({
      ...metadata,
      tags: metadata.tags.filter(t => t !== tag),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2 text-stone-700">Description</label>
        <textarea
          value={metadata.description}
          onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
          className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 resize-none"
          rows={3}
          placeholder="Project description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-stone-700">Client Name</label>
          <input
            type="text"
            value={metadata.client_name}
            onChange={(e) => setMetadata({ ...metadata, client_name: e.target.value })}
            className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
            placeholder="Client name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-stone-700">Client Email</label>
          <input
            type="email"
            value={metadata.client_email}
            onChange={(e) => setMetadata({ ...metadata, client_email: e.target.value })}
            className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
            placeholder="client@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-700">Room Type</label>
        <select
          value={metadata.room_type}
          onChange={(e) => setMetadata({ ...metadata, room_type: e.target.value })}
          className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
        >
          <option value="">Select room type</option>
          <option value="living-room">Living Room</option>
          <option value="kitchen">Kitchen</option>
          <option value="bedroom">Bedroom</option>
          <option value="bathroom">Bathroom</option>
          <option value="dining-room">Dining Room</option>
          <option value="office">Office</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-700">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            className="flex-1 p-3 border border-stone-200 rounded-lg bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300"
            placeholder="Add tag..."
          />
          <button
            onClick={addTag}
            className="px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 font-semibold transition-colors shadow-lg"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-stone-100 rounded-full text-sm flex items-center gap-2"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-stone-600 hover:text-stone-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-stone-700">Notes</label>
        <textarea
          value={metadata.notes}
          onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })}
          className="w-full p-3 border border-stone-200 rounded-lg bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 focus:border-stone-300 resize-none"
          rows={4}
          placeholder="Additional notes..."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full px-4 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-lg"
      >
        {loading ? 'Saving...' : 'Save Metadata'}
      </button>
    </div>
  )
}

