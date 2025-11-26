# ATURE Studio - Implementation Guide
## Tier 1 & Tier 2 Features - Backend & Frontend Documentation

**Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Implementation Ready

---

## Table of Contents

1. [Database Schema Changes](#database-schema-changes)
2. [Tier 1 Features Implementation](#tier-1-features-implementation)
3. [Tier 2 Features Implementation](#tier-2-features-implementation)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Frontend Components Reference](#frontend-components-reference)
6. [State Management](#state-management)
7. [Testing Guidelines](#testing-guidelines)

---

## Database Schema Changes

### New Tables

#### 1. `shared_links` - Client Sharing & Collaboration
```sql
CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  creation_id UUID, -- References creation within project workflow
  user_id TEXT NOT NULL, -- Owner/creator of the share
  token TEXT UNIQUE NOT NULL, -- Unique share token
  access_type TEXT DEFAULT 'view', -- 'view', 'comment', 'edit'
  expires_at TIMESTAMPTZ, -- Optional expiration
  password_hash TEXT, -- Optional password protection
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_links_token ON shared_links(token);
CREATE INDEX idx_shared_links_project_id ON shared_links(project_id);
CREATE INDEX idx_shared_links_user_id ON shared_links(user_id);
```

#### 2. `comments` - Comments on Shared Links
```sql
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_link_id UUID REFERENCES shared_links(id) ON DELETE CASCADE,
  user_id TEXT, -- NULL for anonymous comments
  user_name TEXT, -- Name for anonymous users
  user_email TEXT, -- Email for anonymous users
  content TEXT NOT NULL,
  x_position FLOAT, -- X coordinate for annotation
  y_position FLOAT, -- Y coordinate for annotation
  resolved BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_shared_link_id ON comments(shared_link_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
```

#### 3. `design_variations` - Multiple Design Variations
```sql
CREATE TABLE IF NOT EXISTS design_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT, -- Optional name for variation
  prompt TEXT, -- Prompt used for generation
  room_file_url TEXT,
  asset_file_url TEXT,
  result_url TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE, -- Marked as favorite/selected
  generation_params JSONB, -- Store generation parameters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_variations_project_id ON design_variations(project_id);
CREATE INDEX idx_design_variations_user_id ON design_variations(user_id);
CREATE INDEX idx_design_variations_is_selected ON design_variations(is_selected);
```

#### 4. `project_metadata` - Project Documentation
```sql
CREATE TABLE IF NOT EXISTS project_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  room_type TEXT, -- 'living-room', 'kitchen', 'bedroom', etc.
  room_measurements JSONB, -- { width, height, length, unit }
  budget DECIMAL(10, 2),
  deadline DATE,
  tags TEXT[], -- Array of tags
  notes TEXT, -- Additional notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_metadata_project_id ON project_metadata(project_id);
CREATE INDEX idx_project_metadata_user_id ON project_metadata(user_id);
CREATE INDEX idx_project_metadata_tags ON project_metadata USING GIN(tags);
```

#### 5. `asset_tags` - Enhanced Asset Library
```sql
CREATE TABLE IF NOT EXISTS asset_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, tag)
);

CREATE INDEX idx_asset_tags_asset_id ON asset_tags(asset_id);
CREATE INDEX idx_asset_tags_tag ON asset_tags(tag);
```

#### 6. `asset_folders` - Asset Organization
```sql
CREATE TABLE IF NOT EXISTS asset_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
  color TEXT, -- Hex color for UI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_folders_user_id ON asset_folders(user_id);
CREATE INDEX idx_asset_folders_parent_id ON asset_folders(parent_id);
```

#### 7. `asset_folder_items` - Asset-Folder Relationship
```sql
CREATE TABLE IF NOT EXISTS asset_folder_items (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (asset_id, folder_id)
);

CREATE INDEX idx_asset_folder_items_asset_id ON asset_folder_items(asset_id);
CREATE INDEX idx_asset_folder_items_folder_id ON asset_folder_items(folder_id);
```

#### 8. `creation_versions` - Version History
```sql
CREATE TABLE IF NOT EXISTS creation_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  variation_id UUID REFERENCES design_variations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  result_url TEXT NOT NULL,
  prompt TEXT,
  notes TEXT, -- Version notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, variation_id, version_number)
);

CREATE INDEX idx_creation_versions_project_id ON creation_versions(project_id);
CREATE INDEX idx_creation_versions_variation_id ON creation_versions(variation_id);
```

#### 9. `room_templates` - Room Templates Library
```sql
CREATE TABLE IF NOT EXISTS room_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL, -- 'living-room', 'kitchen', etc.
  style TEXT, -- 'modern', 'traditional', 'minimalist', etc.
  preview_url TEXT,
  room_image_url TEXT, -- Template room image
  is_public BOOLEAN DEFAULT TRUE,
  created_by TEXT, -- user_id if user-created
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_templates_room_type ON room_templates(room_type);
CREATE INDEX idx_room_templates_style ON room_templates(style);
CREATE INDEX idx_room_templates_is_public ON room_templates(is_public);
```

#### 10. `team_members` - Team Collaboration
```sql
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID, -- References a space or project (flexible)
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  invited_by TEXT NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'declined'
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

### Updated Tables

#### `assets` - Add Metadata Fields
```sql
ALTER TABLE assets ADD COLUMN IF NOT EXISTS width DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS height DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS depth DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'cm';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS vendor TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS style TEXT;
```

#### `projects` - Add Sharing Fields
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token TEXT;
```

---

## Tier 1 Features Implementation

### 1. Client Sharing & Collaboration

#### Backend API: `/api/sharing/index.js`

```javascript
// api/sharing/index.js
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Generate unique share token
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')
  const { method } = req
  const { token, projectId, linkId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (token) {
          // Public access - get shared link by token
          const { data: link, error } = await supabase
            .from('shared_links')
            .select(`
              *,
              projects:project_id (
                id,
                name,
                workflow,
                project_metadata (*)
              )
            `)
            .eq('token', token)
            .single()

          if (error || !link) {
            return res.status(404).json({ error: 'Shared link not found' })
          }

          // Check expiration
          if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return res.status(410).json({ error: 'Link has expired' })
          }

          // Update view count
          await supabase
            .from('shared_links')
            .update({ 
              view_count: link.view_count + 1,
              last_accessed_at: new Date().toISOString()
            })
            .eq('id', link.id)

          return res.status(200).json(link)
        } else if (linkId) {
          // Get link details (owner only)
          const { data: link, error } = await supabase
            .from('shared_links')
            .select('*, comments(*)')
            .eq('id', linkId)
            .eq('user_id', userId)
            .single()

          if (error) throw error
          return res.status(200).json(link)
        } else {
          // Get all shared links for user
          const { data: links, error } = await supabase
            .from('shared_links')
            .select('*, projects:project_id (id, name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (error) throw error
          return res.status(200).json({ links })
        }

      case 'POST':
        // Create new share link
        const { projectId: newProjectId, creationId, accessType, expiresAt, password } = req.body

        if (!newProjectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        // Verify project ownership
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('id', newProjectId)
          .eq('user_id', userId)
          .single()

        if (!project) {
          return res.status(403).json({ error: 'Project not found or access denied' })
        }

        const shareToken = generateShareToken()
        let passwordHash = null
        if (password) {
          passwordHash = crypto.createHash('sha256').update(password).digest('hex')
        }

        const { data: newLink, error: insertError } = await supabase
          .from('shared_links')
          .insert({
            project_id: newProjectId,
            creation_id: creationId || null,
            user_id: userId,
            token: shareToken,
            access_type: accessType || 'view',
            expires_at: expiresAt || null,
            password_hash: passwordHash,
          })
          .select()
          .single()

        if (insertError) throw insertError

        return res.status(201).json(newLink)

      case 'PUT':
        // Update share link settings
        if (!linkId) {
          return res.status(400).json({ error: 'Link ID is required' })
        }

        const updates = req.body
        const { data: updatedLink, error: updateError } = await supabase
          .from('shared_links')
          .update(updates)
          .eq('id', linkId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json(updatedLink)

      case 'DELETE':
        // Delete share link
        if (!linkId) {
          return res.status(400).json({ error: 'Link ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('shared_links')
          .delete()
          .eq('id', linkId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Link deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Sharing API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

#### Backend API: `/api/sharing/comments.js`

```javascript
// api/sharing/comments.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method } = req
  const { linkToken, commentId } = req.query

  try {
    switch (method) {
      case 'GET':
        // Get comments for a shared link
        if (!linkToken) {
          return res.status(400).json({ error: 'Link token is required' })
        }

        // Get link to verify access
        const { data: link } = await supabase
          .from('shared_links')
          .select('id, access_type')
          .eq('token', linkToken)
          .single()

        if (!link) {
          return res.status(404).json({ error: 'Shared link not found' })
        }

        // Get comments
        const { data: comments, error } = await supabase
          .from('comments')
          .select('*')
          .eq('shared_link_id', link.id)
          .order('created_at', { ascending: true })

        if (error) throw error
        return res.status(200).json({ comments })

      case 'POST':
        // Add comment
        const { content, xPosition, yPosition, userName, userEmail, parentId } = req.body

        if (!linkToken || !content) {
          return res.status(400).json({ error: 'Link token and content are required' })
        }

        // Get link
        const { data: linkData } = await supabase
          .from('shared_links')
          .select('id, access_type')
          .eq('token', linkToken)
          .single()

        if (!linkData) {
          return res.status(404).json({ error: 'Shared link not found' })
        }

        // Check if comments allowed
        if (!['comment', 'edit'].includes(linkData.access_type)) {
          return res.status(403).json({ error: 'Comments not allowed on this link' })
        }

        // Get user ID if authenticated
        const authHeader = req.headers.authorization
        let userId = null
        if (authHeader && authHeader.startsWith('Bearer ')) {
          userId = authHeader.replace('Bearer ', '')
        }

        const { data: newComment, error: insertError } = await supabase
          .from('comments')
          .insert({
            shared_link_id: linkData.id,
            user_id: userId,
            user_name: userName || null,
            user_email: userEmail || null,
            content,
            x_position: xPosition || null,
            y_position: yPosition || null,
            parent_id: parentId || null,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return res.status(201).json(newComment)

      case 'PUT':
        // Update comment (resolve, edit)
        if (!commentId) {
          return res.status(400).json({ error: 'Comment ID is required' })
        }

        const updates = req.body
        const { data: updatedComment, error: updateError } = await supabase
          .from('comments')
          .update(updates)
          .eq('id', commentId)
          .select()
          .single()

        if (updateError) throw updateError
        return res.status(200).json(updatedComment)

      case 'DELETE':
        // Delete comment
        if (!commentId) {
          return res.status(400).json({ error: 'Comment ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Comment deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Comments API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

#### Frontend Component: `ShareModal.jsx`

```jsx
// src/components/ShareModal.jsx
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
    // Show toast notification
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Share Project</h2>
        
        {!shareLink ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Access Type</label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="view">View Only</option>
                  <option value="comment">View & Comment</option>
                  <option value="edit">View, Comment & Edit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Set password protection"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={createShareLink}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
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
                    className="flex-1 p-2 border rounded-lg bg-stone-50"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="text-sm text-stone-600">
                <p>Access Type: {shareLink.access_type}</p>
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
                className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
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
```

#### Frontend Component: `SharedView.jsx`

```jsx
// src/components/SharedView.jsx
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

  useEffect(() => {
    loadSharedLink()
  }, [token])

  const loadSharedLink = async () => {
    try {
      const response = await fetch(`/api/sharing?token=${token}`)
      
      if (response.status === 401) {
        setPasswordRequired(true)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load shared link')
      }

      const linkData = await response.json()
      setLink(linkData)
      loadComments()
    } catch (error) {
      console.error('Error loading shared link:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/sharing/comments?linkToken=${token}`)
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
      const response = await fetch('/api/sharing/comments', {
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
    return <div>Loading...</div>
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Password Required</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
            placeholder="Enter password"
          />
          <button
            onClick={() => {
              // Verify password and load link
              loadSharedLink()
            }}
            className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg"
          >
            Access
          </button>
        </div>
      </div>
    )
  }

  if (!link) {
    return <div>Link not found or expired</div>
  }

  const project = link.projects
  const resultUrl = project?.workflow?.result?.url || project?.workflow?.resultUrl

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">{project?.name}</h1>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            {resultUrl && (
              <img
                src={resultUrl}
                alt="Shared design"
                className="w-full rounded-lg shadow-lg"
              />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Comments</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-white rounded-lg">
                    <p className="font-medium text-sm">{comment.user_name || 'Anonymous'}</p>
                    <p className="text-sm text-stone-600">{comment.content}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {link.access_type !== 'view' && (
              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-2 border rounded-lg mb-2"
                  rows={3}
                />
                <button
                  onClick={addComment}
                  className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
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
```

---

### 2. Multiple Design Variations

#### Backend API: `/api/variations/index.js`

```javascript
// api/variations/index.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')
  const { method } = req
  const { projectId, variationId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (variationId) {
          // Get single variation
          const { data: variation, error } = await supabase
            .from('design_variations')
            .select('*')
            .eq('id', variationId)
            .eq('user_id', userId)
            .single()

          if (error) throw error
          return res.status(200).json(variation)
        } else if (projectId) {
          // Get all variations for project
          const { data: variations, error } = await supabase
            .from('design_variations')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

          if (error) throw error
          return res.status(200).json({ variations })
        } else {
          return res.status(400).json({ error: 'Project ID or Variation ID required' })
        }

      case 'POST':
        // Create new variation(s) - can create multiple at once
        const { variations } = req.body

        if (!variations || !Array.isArray(variations)) {
          return res.status(400).json({ error: 'Variations array is required' })
        }

        // Verify project ownership
        const projectIdToCheck = variations[0]?.project_id
        if (projectIdToCheck) {
          const { data: project } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectIdToCheck)
            .eq('user_id', userId)
            .single()

          if (!project) {
            return res.status(403).json({ error: 'Project not found or access denied' })
          }
        }

        const variationsToInsert = variations.map(v => ({
          ...v,
          user_id: userId,
        }))

        const { data: newVariations, error: insertError } = await supabase
          .from('design_variations')
          .insert(variationsToInsert)
          .select()

        if (insertError) throw insertError
        return res.status(201).json({ variations: newVariations })

      case 'PUT':
        // Update variation (e.g., mark as selected, update name)
        if (!variationId) {
          return res.status(400).json({ error: 'Variation ID is required' })
        }

        const updates = req.body
        const { data: updatedVariation, error: updateError } = await supabase
          .from('design_variations')
          .update(updates)
          .eq('id', variationId)
          .eq('user_id', userId)
          .select()
          .single()

        if (updateError) throw updateError

        // If marking as selected, unselect others
        if (updates.is_selected) {
          await supabase
            .from('design_variations')
            .update({ is_selected: false })
            .eq('project_id', updatedVariation.project_id)
            .neq('id', variationId)
        }

        return res.status(200).json(updatedVariation)

      case 'DELETE':
        // Delete variation
        if (!variationId) {
          return res.status(400).json({ error: 'Variation ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('design_variations')
          .delete()
          .eq('id', variationId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Variation deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Variations API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

#### Frontend Component: `VariationsView.jsx`

```jsx
// src/components/VariationsView.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function VariationsView({ projectId, onSelectVariation }) {
  const { userId } = useAuth()
  const [variations, setVariations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    loadVariations()
  }, [projectId])

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
      const response = await fetch(`/api/variations?variationId=${variationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
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
    return <div>Loading variations...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Design Variations ({variations.length})</h3>
      </div>

      {variations.length === 0 ? (
        <div className="text-center py-8 text-stone-500">
          No variations yet. Generate multiple designs to see them here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {variations.map((variation) => (
            <div
              key={variation.id}
              className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                selectedId === variation.id
                  ? 'border-stone-900 shadow-lg'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
              onClick={() => {
                setSelectedId(variation.id)
                if (onSelectVariation) onSelectVariation(variation)
              }}
            >
              <img
                src={variation.result_url}
                alt={variation.name || 'Variation'}
                className="w-full aspect-square object-cover"
              />
              {selectedId === variation.id && (
                <div className="absolute top-2 right-2 bg-stone-900 text-white px-2 py-1 rounded text-xs font-semibold">
                  Selected
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2">
                <p className="text-xs truncate">{variation.name || 'Untitled Variation'}</p>
                <p className="text-[10px] text-stone-300">
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
```

#### Updated WorkspaceView: Batch Generation

```jsx
// Add to WorkspaceView.jsx
const [generatingVariations, setGeneratingVariations] = useState(false)
const [variationCount, setVariationCount] = useState(3)

const generateVariations = async () => {
  setGeneratingVariations(true)
  setError('')

  try {
    const variations = []
    
    // Generate multiple variations
    for (let i = 0; i < variationCount; i++) {
      const variationPrompt = `${prompt} (variation ${i + 1})`
      const result = await callGeminiAPI(variationPrompt)
      
      if (result) {
        variations.push({
          project_id: projectId,
          name: `Variation ${i + 1}`,
          prompt: variationPrompt,
          room_file_url: roomPreviewUrl,
          asset_file_url: assetPreviewUrl,
          result_url: result,
          generation_params: {
            variation_index: i,
            timestamp: new Date().toISOString(),
          },
        })
      }
    }

    // Save all variations to database
    if (variations.length > 0) {
      const response = await fetch('/api/variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({ variations }),
      })

      if (response.ok) {
        const data = await response.json()
        // Show success message
        // Optionally navigate to variations view
      }
    }
  } catch (error) {
    setError(`Failed to generate variations: ${error.message}`)
  } finally {
    setGeneratingVariations(false)
  }
}
```

---

### 3. Export & Presentation Tools

#### Backend API: `/api/export/index.js`

```javascript
// api/export/index.js
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'
import { Readable } from 'stream'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { projectId, format, resolution, includeMetadata, watermark } = req.body

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, project_metadata(*)')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    const resultUrl = project.workflow?.result?.url || project.workflow?.resultUrl

    if (!resultUrl) {
      return res.status(400).json({ error: 'No result image found' })
    }

    if (format === 'pdf') {
      // Generate PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks = []

      doc.on('data', chunk => chunks.push(chunk))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${project.name}.pdf"`)
        res.send(pdfBuffer)
      })

      // Add project name
      doc.fontSize(20).text(project.name, { align: 'center' })
      doc.moveDown()

      // Add metadata if requested
      if (includeMetadata && project.project_metadata) {
        const metadata = project.project_metadata
        doc.fontSize(12)
        if (metadata.client_name) doc.text(`Client: ${metadata.client_name}`)
        if (metadata.description) doc.text(`Description: ${metadata.description}`)
        doc.moveDown()
      }

      // Fetch and add image
      const imageResponse = await fetch(resultUrl)
      const imageBuffer = await imageResponse.arrayBuffer()
      const image = Buffer.from(imageBuffer)

      doc.image(image, {
        fit: [500, 500],
        align: 'center',
        valign: 'center',
      })

      doc.end()
    } else {
      // Export as image (high-res)
      const imageResponse = await fetch(resultUrl)
      const imageBuffer = await imageResponse.arrayBuffer()

      // Apply watermark if requested
      // (Would need image processing library like sharp)

      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}.png"`)
      res.send(Buffer.from(imageBuffer))
    }
  } catch (error) {
    console.error('Export API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

#### Frontend Component: `ExportModal.jsx`

```jsx
// src/components/ExportModal.jsx
import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function ExportModal({ projectId, projectName, onClose }) {
  const { userId } = useAuth()
  const [format, setFormat] = useState('png')
  const [resolution, setResolution] = useState('4k')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [watermark, setWatermark] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          projectId,
          format,
          resolution,
          includeMetadata,
          watermark,
        }),
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName}.${format === 'pdf' ? 'pdf' : 'png'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      onClose()
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Export Design</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="png">PNG Image</option>
              <option value="jpg">JPG Image</option>
              <option value="pdf">PDF Document</option>
            </select>
          </div>

          {format !== 'pdf' && (
            <div>
              <label className="block text-sm font-medium mb-2">Resolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="1k">1K (1024x1024)</option>
                <option value="2k">2K (2048x2048)</option>
                <option value="4k">4K (4096x4096)</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="metadata"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="metadata" className="text-sm">
              Include project metadata
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="watermark"
              checked={watermark}
              onChange={(e) => setWatermark(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="watermark" className="text-sm">
              Add watermark
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### 4. Project Documentation

#### Backend API: `/api/projects/metadata.js`

```javascript
// api/projects/metadata.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')
  const { method } = req
  const { projectId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const { data: metadata, error } = await supabase
          .from('project_metadata')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        return res.status(200).json(metadata || null)

      case 'POST':
      case 'PUT':
        // Upsert metadata
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        // Verify project ownership
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('user_id', userId)
          .single()

        if (!project) {
          return res.status(403).json({ error: 'Project not found or access denied' })
        }

        const metadataData = req.body
        const { data: metadataResult, error: upsertError } = await supabase
          .from('project_metadata')
          .upsert({
            project_id: projectId,
            user_id: userId,
            ...metadataData,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id'
          })
          .select()
          .single()

        if (upsertError) throw upsertError
        return res.status(method === 'POST' ? 201 : 200).json(metadataResult)

      case 'DELETE':
        if (!projectId) {
          return res.status(400).json({ error: 'Project ID is required' })
        }

        const { error: deleteError } = await supabase
          .from('project_metadata')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Metadata deleted' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Metadata API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

#### Frontend Component: `ProjectMetadataForm.jsx`

```jsx
// src/components/ProjectMetadataForm.jsx
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
    loadMetadata()
  }, [projectId])

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
        // Show success message
      }
    } catch (error) {
      console.error('Error saving metadata:', error)
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
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={metadata.description}
          onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
          className="w-full p-3 border rounded-lg"
          rows={3}
          placeholder="Project description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Client Name</label>
          <input
            type="text"
            value={metadata.client_name}
            onChange={(e) => setMetadata({ ...metadata, client_name: e.target.value })}
            className="w-full p-2 border rounded-lg"
            placeholder="Client name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Client Email</label>
          <input
            type="email"
            value={metadata.client_email}
            onChange={(e) => setMetadata({ ...metadata, client_email: e.target.value })}
            className="w-full p-2 border rounded-lg"
            placeholder="client@example.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Room Type</label>
        <select
          value={metadata.room_type}
          onChange={(e) => setMetadata({ ...metadata, room_type: e.target.value })}
          className="w-full p-2 border rounded-lg"
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
        <label className="block text-sm font-medium mb-2">Room Measurements</label>
        <div className="grid grid-cols-4 gap-2">
          <input
            type="number"
            value={metadata.room_measurements.width}
            onChange={(e) => setMetadata({
              ...metadata,
              room_measurements: { ...metadata.room_measurements, width: e.target.value }
            })}
            className="p-2 border rounded-lg"
            placeholder="Width"
          />
          <input
            type="number"
            value={metadata.room_measurements.height}
            onChange={(e) => setMetadata({
              ...metadata,
              room_measurements: { ...metadata.room_measurements, height: e.target.value }
            })}
            className="p-2 border rounded-lg"
            placeholder="Height"
          />
          <input
            type="number"
            value={metadata.room_measurements.length}
            onChange={(e) => setMetadata({
              ...metadata,
              room_measurements: { ...metadata.room_measurements, length: e.target.value }
            })}
            className="p-2 border rounded-lg"
            placeholder="Length"
          />
          <select
            value={metadata.room_measurements.unit}
            onChange={(e) => setMetadata({
              ...metadata,
              room_measurements: { ...metadata.room_measurements, unit: e.target.value }
            })}
            className="p-2 border rounded-lg"
          >
            <option value="ft">ft</option>
            <option value="m">m</option>
            <option value="cm">cm</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            className="flex-1 p-2 border rounded-lg"
            placeholder="Add tag..."
          />
          <button
            onClick={addTag}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
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
        <label className="block text-sm font-medium mb-2">Notes</label>
        <textarea
          value={metadata.notes}
          onChange={(e) => setMetadata({ ...metadata, notes: e.target.value })}
          className="w-full p-3 border rounded-lg"
          rows={4}
          placeholder="Additional notes..."
        />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Metadata'}
      </button>
    </div>
  )
}
```

---

### 5. Enhanced Asset Library

#### Backend API: `/api/assets/tags.js`

```javascript
// api/assets/tags.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')
  const { method } = req
  const { assetId, tag } = req.query

  try {
    switch (method) {
      case 'GET':
        // Get all tags for an asset or all tags for user
        if (assetId) {
          const { data: tags, error } = await supabase
            .from('asset_tags')
            .select('tag')
            .eq('asset_id', assetId)

          if (error) throw error
          return res.status(200).json({ tags: tags.map(t => t.tag) })
        } else {
          // Get all unique tags for user
          const { data: tags, error } = await supabase
            .from('asset_tags')
            .select('tag')
            .eq('assets.user_id', userId)
            .select('tag')

          if (error) throw error
          const uniqueTags = [...new Set(tags.map(t => t.tag))]
          return res.status(200).json({ tags: uniqueTags })
        }

      case 'POST':
        // Add tag to asset
        const { assetId: newAssetId, tag: newTag } = req.body

        if (!newAssetId || !newTag) {
          return res.status(400).json({ error: 'Asset ID and tag are required' })
        }

        // Verify asset ownership
        const { data: asset } = await supabase
          .from('assets')
          .select('id')
          .eq('id', newAssetId)
          .eq('user_id', userId)
          .single()

        if (!asset) {
          return res.status(403).json({ error: 'Asset not found or access denied' })
        }

        const { data: newTagData, error: insertError } = await supabase
          .from('asset_tags')
          .insert({
            asset_id: newAssetId,
            tag: newTag.toLowerCase().trim(),
          })
          .select()
          .single()

        if (insertError) {
          if (insertError.code === '23505') { // Unique constraint violation
            return res.status(200).json({ message: 'Tag already exists' })
          }
          throw insertError
        }

        return res.status(201).json(newTagData)

      case 'DELETE':
        // Remove tag from asset
        if (!assetId || !tag) {
          return res.status(400).json({ error: 'Asset ID and tag are required' })
        }

        const { error: deleteError } = await supabase
          .from('asset_tags')
          .delete()
          .eq('asset_id', assetId)
          .eq('tag', tag)

        if (deleteError) throw deleteError
        return res.status(200).json({ message: 'Tag removed' })

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Asset Tags API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

#### Updated Assets API: `/api/assets/index.js` (Enhanced)

```javascript
// Add search and filtering to existing assets API
// In GET handler, add query parameters:

const { search, tags, folderId, sortBy, sortOrder } = req.query

let query = supabase
  .from('assets')
  .select(`
    *,
    asset_tags(tag),
    asset_folder_items(folder_id)
  `)
  .eq('user_id', userId)

// Search by name or description
if (search) {
  query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
}

// Filter by tags
if (tags) {
  const tagArray = Array.isArray(tags) ? tags : [tags]
  query = query.in('asset_tags.tag', tagArray)
}

// Filter by folder
if (folderId) {
  query = query.eq('asset_folder_items.folder_id', folderId)
}

// Sorting
const sortColumn = sortBy || 'created_at'
const ascending = sortOrder !== 'desc'
query = query.order(sortColumn, { ascending })

const { data: assets, error } = await query
```

#### Frontend Component: `EnhancedAssetLibrary.jsx`

```jsx
// src/components/EnhancedAssetLibrary.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function EnhancedAssetLibrary({ projectId }) {
  const { userId } = useAuth()
  const [assets, setAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAssets()
    loadTags()
    loadFolders()
  }, [searchQuery, selectedTags, selectedFolder])

  const loadAssets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTags.length > 0) {
        selectedTags.forEach(tag => params.append('tags', tag))
      }
      if (selectedFolder) params.append('folderId', selectedFolder)

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
      const response = await fetch('/api/assets/tags', {
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

  const loadFolders = async () => {
    // Load folders implementation
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search assets..."
          className="flex-1 p-2 border rounded-lg"
        />
        <select
          value={selectedFolder || ''}
          onChange={(e) => setSelectedFolder(e.target.value || null)}
          className="p-2 border rounded-lg"
        >
          <option value="">All Folders</option>
          {folders.map(folder => (
            <option key={folder.id} value={folder.id}>{folder.name}</option>
          ))}
        </select>
      </div>

      {/* Tags Filter */}
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
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTags.includes(tag)
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {assets.map(asset => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Tier 2 Features Implementation

### 6. AR/3D Preview

#### Frontend Component: `ARView.jsx`

```jsx
// src/components/ARView.jsx
import { useState, useRef, useEffect } from 'react'
import '@google/model-viewer'

export default function ARView({ imageUrl, modelUrl }) {
  const [arSupported, setArSupported] = useState(false)
  const modelViewerRef = useRef(null)

  useEffect(() => {
    // Check AR support
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-ar').then(supported => {
        setArSupported(supported)
      })
    }
  }, [])

  if (!arSupported && !modelUrl) {
    return (
      <div className="text-center py-8 text-stone-500">
        AR not supported on this device
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {modelUrl ? (
        <model-viewer
          ref={modelViewerRef}
          src={modelUrl}
          alt="3D Model"
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          environment-image="neutral"
          style={{ width: '100%', height: '100%' }}
        >
          <button
            slot="ar-button"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-900 text-white rounded-lg"
          >
            View in AR
          </button>
        </model-viewer>
      ) : (
        <div className="relative w-full h-full">
          <img src={imageUrl} alt="Design" className="w-full h-full object-contain" />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-stone-600">
            AR preview available for 3D models
          </p>
        </div>
      )}
    </div>
  )
}
```

---

### 7. Room Templates Library

#### Backend API: `/api/templates/index.js`

```javascript
// api/templates/index.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { method } = req
  const { templateId, roomType, style } = req.query

  try {
    switch (method) {
      case 'GET':
        if (templateId) {
          // Get single template
          const { data: template, error } = await supabase
            .from('room_templates')
            .select('*')
            .eq('id', templateId)
            .single()

          if (error) throw error
          return res.status(200).json(template)
        } else {
          // Get all templates with filters
          let query = supabase
            .from('room_templates')
            .select('*')
            .eq('is_public', true)

          if (roomType) {
            query = query.eq('room_type', roomType)
          }

          if (style) {
            query = query.eq('style', style)
          }

          query = query.order('usage_count', { ascending: false })

          const { data: templates, error } = await query

          if (error) throw error
          return res.status(200).json({ templates })
        }

      case 'POST':
        // Create new template (admin or user-created)
        const authHeader = req.headers.authorization
        const userId = authHeader?.replace('Bearer ', '') || null

        const templateData = req.body
        const { data: newTemplate, error: insertError } = await supabase
          .from('room_templates')
          .insert({
            ...templateData,
            created_by: userId,
            is_public: userId ? false : true, // User templates are private by default
          })
          .select()
          .single()

        if (insertError) throw insertError
        return res.status(201).json(newTemplate)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Templates API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

---

### 8. Version History

#### Backend API: `/api/versions/index.js`

```javascript
// api/versions/index.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = authHeader.replace('Bearer ', '')
  const { method } = req
  const { variationId, versionId } = req.query

  try {
    switch (method) {
      case 'GET':
        if (!variationId) {
          return res.status(400).json({ error: 'Variation ID is required' })
        }

        const { data: versions, error } = await supabase
          .from('creation_versions')
          .select('*')
          .eq('variation_id', variationId)
          .order('version_number', { ascending: false })

        if (error) throw error
        return res.status(200).json({ versions })

      case 'POST':
        // Create new version
        const { variationId: newVariationId, resultUrl, prompt, notes } = req.body

        if (!newVariationId || !resultUrl) {
          return res.status(400).json({ error: 'Variation ID and result URL are required' })
        }

        // Get latest version number
        const { data: latestVersion } = await supabase
          .from('creation_versions')
          .select('version_number')
          .eq('variation_id', newVariationId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single()

        const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1

        const { data: newVersion, error: insertError } = await supabase
          .from('creation_versions')
          .insert({
            variation_id: newVariationId,
            user_id: userId,
            version_number: nextVersionNumber,
            result_url: resultUrl,
            prompt: prompt || null,
            notes: notes || null,
          })
          .select()
          .single()

        if (insertError) throw insertError
        return res.status(201).json(newVersion)

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error) {
    console.error('Versions API Error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}
```

---

## API Endpoints Reference

### Summary Table

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/sharing` | GET | Get shared link | No (public) |
| `/api/sharing` | POST | Create share link | Yes |
| `/api/sharing/comments` | GET | Get comments | No (public) |
| `/api/sharing/comments` | POST | Add comment | No (public) |
| `/api/variations` | GET | Get variations | Yes |
| `/api/variations` | POST | Create variations | Yes |
| `/api/export` | POST | Export project | Yes |
| `/api/projects/metadata` | GET | Get metadata | Yes |
| `/api/projects/metadata` | PUT | Update metadata | Yes |
| `/api/assets/tags` | GET | Get tags | Yes |
| `/api/assets/tags` | POST | Add tag | Yes |
| `/api/templates` | GET | Get templates | No |
| `/api/versions` | GET | Get versions | Yes |
| `/api/versions` | POST | Create version | Yes |

---

## Frontend Components Reference

### Component Structure

```
src/components/
├── ShareModal.jsx          # Share link creation
├── SharedView.jsx          # Public shared view
├── VariationsView.jsx      # Multiple variations display
├── ExportModal.jsx         # Export options
├── ProjectMetadataForm.jsx # Project documentation
├── EnhancedAssetLibrary.jsx # Enhanced asset management
├── ARView.jsx              # AR/3D preview
├── TemplatesLibrary.jsx   # Room templates
└── VersionHistory.jsx      # Version comparison
```

---

## State Management

### Recommended Patterns

1. **Local State**: Use `useState` for component-specific state
2. **API State**: Use `useEffect` + `useState` for API data
3. **Shared State**: Consider Context API for shared data (projects, assets)
4. **Form State**: Use controlled components with `useState`

### Example Context Provider

```jsx
// src/context/ProjectContext.jsx
import { createContext, useContext, useState } from 'react'

const ProjectContext = createContext()

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)

  return (
    <ProjectContext.Provider value={{
      projects,
      setProjects,
      selectedProject,
      setSelectedProject,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export const useProject = () => useContext(ProjectContext)
```

---

## Testing Guidelines

### Backend Testing

1. **API Endpoints**: Test all CRUD operations
2. **Authentication**: Verify user_id validation
3. **Error Handling**: Test error cases (404, 403, 500)
4. **Edge Cases**: Test with missing/invalid data

### Frontend Testing

1. **Component Rendering**: Test component renders correctly
2. **User Interactions**: Test button clicks, form submissions
3. **API Integration**: Mock API calls, test error states
4. **State Management**: Test state updates

### Example Test

```javascript
// __tests__/ShareModal.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import ShareModal from '../components/ShareModal'

test('creates share link on submit', async () => {
  const mockOnClose = jest.fn()
  render(<ShareModal projectId="123" onClose={mockOnClose} />)
  
  const createButton = screen.getByText('Create Link')
  fireEvent.click(createButton)
  
  // Assert API call and success
})
```

---

## Deployment Checklist

### Database
- [ ] Run all migration scripts
- [ ] Create indexes
- [ ] Set up RLS policies
- [ ] Test database connections

### Backend
- [ ] Deploy all API endpoints
- [ ] Set environment variables
- [ ] Test API endpoints
- [ ] Set up error logging

### Frontend
- [ ] Build production bundle
- [ ] Test all components
- [ ] Verify routing
- [ ] Test on multiple devices

---

**Implementation Guide Complete**

For questions or clarifications, refer to:
- `FEATURE_ANALYSIS_REPORT.md` - Feature analysis and prioritization
- `FEATURE_PRIORITY_QUICK_REFERENCE.md` - Quick reference guide
- `PROJECT_OVERVIEW.md` - Overall project documentation

