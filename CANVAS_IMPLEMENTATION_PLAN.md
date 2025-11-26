# Infinite Canvas Implementation Plan
## Inspired by Visual Electric (https://visualelectric.com)

## 🎯 What Visual Electric Offers

Based on [Visual Electric](https://visualelectric.com), their key canvas features are:

1. **Infinite Canvas** - Spatial workspace where you can place multiple images
2. **Generate** - Create images directly on canvas with natural language
3. **Explore** - Art Director mode (describe changes to regenerate)
4. **Refine** - Retouch, upscale, adjust images on canvas
5. **Real-time Collaboration** - Multiple users on shared canvas
6. **Video Generation** - Animate images on canvas
7. **Style Library** - Apply styles to canvas items

---

## ✅ Feasibility Assessment

### **Difficulty Level: Medium-High** (but very doable!)

**Why it's achievable:**
- ✅ Mature libraries available (Fabric.js, Konva.js, react-konva)
- ✅ Your current architecture supports it (React + Vite)
- ✅ You already have image generation, variations, and export
- ✅ Database can store canvas state

**Challenges:**
- ⚠️ Performance with many images (needs optimization)
- ⚠️ State management complexity (canvas items, positions, zoom)
- ⚠️ Real-time collaboration (requires WebSockets)
- ⚠️ Mobile responsiveness (canvas interactions)

---

## 🛠️ Implementation Approach

### Option 1: **react-konva** (Recommended)
**Best for:** React integration, good performance, active development

```bash
npm install react-konva konva
```

**Pros:**
- ✅ React-friendly (declarative)
- ✅ Good performance
- ✅ Built-in zoom/pan
- ✅ Easy to integrate with your existing components
- ✅ TypeScript support

**Cons:**
- ⚠️ Learning curve for canvas concepts
- ⚠️ Mobile touch events need extra work

### Option 2: **Fabric.js**
**Best for:** Rich features, mature library

**Pros:**
- ✅ Very feature-rich
- ✅ Excellent documentation
- ✅ Built-in object manipulation
- ✅ Good for complex interactions

**Cons:**
- ⚠️ Not React-native (needs wrapper)
- ⚠️ Larger bundle size
- ⚠️ More complex API

### Option 3: **Excalidraw-like approach**
**Best for:** Simpler, custom implementation

**Pros:**
- ✅ Full control
- ✅ Smaller bundle
- ✅ Customized to your needs

**Cons:**
- ⚠️ More development time
- ⚠️ Need to build everything

---

## 📋 Implementation Steps

### Phase 1: Basic Canvas (1-2 weeks)
1. **Install react-konva**
   ```bash
   npm install react-konva konva
   ```

2. **Create CanvasView Component**
   - Infinite scrolling canvas
   - Pan and zoom controls
   - Place images on canvas
   - Drag and drop images

3. **Database Schema**
   ```sql
   CREATE TABLE canvas_items (
     id UUID PRIMARY KEY,
     project_id UUID REFERENCES projects(id),
     user_id TEXT,
     image_url TEXT,
     x_position FLOAT,
     y_position FLOAT,
     width FLOAT,
     height FLOAT,
     rotation FLOAT DEFAULT 0,
     z_index INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **API Endpoints**
   - `GET /api/canvas/:projectId` - Load canvas state
   - `POST /api/canvas/items` - Add item to canvas
   - `PUT /api/canvas/items/:id` - Update item position/size
   - `DELETE /api/canvas/items/:id` - Remove item

### Phase 2: Generation on Canvas (1 week)
1. **Generate directly to canvas**
   - Generate button creates new image on canvas
   - Auto-position new generations
   - Batch generation places multiple items

2. **Variations on canvas**
   - Generate variations around selected item
   - Visual grouping of variations

### Phase 3: Editing on Canvas (1-2 weeks)
1. **Art Director Mode**
   - Select canvas item
   - Describe changes
   - Regenerate in place

2. **Refine Tools**
   - Retouch (select area, regenerate)
   - Upscale (selected item)
   - Adjustments (sliders for selected item)

### Phase 4: Advanced Features (2-3 weeks)
1. **Real-time Collaboration**
   - WebSocket integration
   - Multi-user cursors
   - Live updates

2. **Video Generation**
   - Select canvas item
   - Generate video
   - Place on canvas

3. **Export Canvas**
   - Export entire canvas as image
   - Export selected items
   - Export as PDF

---

## 💻 Quick Start Implementation

### 1. Install Dependencies
```bash
npm install react-konva konva
```

### 2. Basic Canvas Component Structure
```jsx
// src/components/CanvasView.jsx
import { Stage, Layer, Image, Group } from 'react-konva'
import { useState, useRef } from 'react'

export default function CanvasView({ projectId }) {
  const [items, setItems] = useState([])
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const stageRef = useRef(null)

  return (
    <div className="h-full w-full relative">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        draggable
        onDragEnd={(e) => {
          setPosition({ x: e.target.x(), y: e.target.y() })
        }}
        onWheel={(e) => {
          e.evt.preventDefault()
          const scaleBy = 1.1
          const stage = e.target.getStage()
          const oldScale = stage.scaleX()
          const pointer = stage.getPointerPosition()
          const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy
          setZoom(newScale)
          stage.scale({ x: newScale, y: newScale })
        }}
      >
        <Layer>
          {items.map((item) => (
            <Image
              key={item.id}
              image={item.image}
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              draggable
              onDragEnd={(e) => {
                // Update position in database
                updateItemPosition(item.id, e.target.x(), e.target.y())
              }}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}
```

### 3. Integration with WorkspaceView
- Replace single image view with CanvasView
- Generate button adds new image to canvas
- Variations generate as canvas items

---

## 🎨 UI/UX Considerations

### Canvas Controls
- **Zoom**: Mouse wheel or buttons
- **Pan**: Click and drag background
- **Select**: Click on image
- **Move**: Drag selected image
- **Resize**: Corner handles on selected image
- **Delete**: Delete key or button

### Toolbar
- Generate button (adds to canvas)
- Zoom controls
- Grid toggle
- Export canvas
- Share canvas

### Sidebar
- Asset library (drag to canvas)
- Variations panel
- Edit tools (when item selected)

---

## 📊 Performance Optimization

1. **Virtual Rendering**
   - Only render visible items
   - Use `react-window` or similar

2. **Image Optimization**
   - Lazy load images
   - Use thumbnails for off-screen items
   - Progressive loading

3. **State Management**
   - Use React Context or Zustand
   - Debounce position updates
   - Batch database saves

4. **Canvas Optimization**
   - Limit redraws
   - Use `willReadFrequently` flag
   - Cache rendered layers

---

## 🔄 Migration Path

### Step 1: Add Canvas as Alternative View
- Keep current WorkspaceView
- Add "Canvas Mode" toggle
- Users can switch between views

### Step 2: Make Canvas Default
- After testing, make canvas default
- Keep single-image view as option

### Step 3: Full Canvas Features
- Add all advanced features
- Remove single-image view (or keep as simple mode)

---

## 📦 Estimated Timeline

- **Basic Canvas**: 1-2 weeks
- **Generation on Canvas**: 1 week
- **Editing Tools**: 1-2 weeks
- **Real-time Collaboration**: 2-3 weeks
- **Polish & Optimization**: 1-2 weeks

**Total: 6-10 weeks** (depending on features)

---

## 🚀 Quick Win: Start Simple

**Week 1 MVP:**
1. Install react-konva
2. Create basic infinite canvas
3. Add single image to canvas
4. Pan and zoom
5. Save canvas state to database

This gives you the core experience and you can build from there!

---

## 📚 Resources

- [react-konva Documentation](https://konvajs.org/docs/react/)
- [Fabric.js Documentation](http://fabricjs.com/)
- [Visual Electric Inspiration](https://visualelectric.com)
- [Excalidraw Source Code](https://github.com/excalidraw/excalidraw) (great reference)

---

## ✅ Recommendation

**Start with react-konva** for a React-friendly, performant solution. Begin with a simple MVP (infinite canvas + place images) and iterate based on user feedback.

The canvas concept is **definitely achievable** and would be a **major differentiator** for ATURE Studio! 🎨

