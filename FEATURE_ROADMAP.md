# Feature Implementation Roadmap

Based on Visual Electric research + Interior Design workflow analysis

---

## 1. MUST-HAVE (VE Parity - Week 1)

### 1.1 Infinite Canvas ✅ (Partially Complete)
- **Status**: Canvas is 4x larger with zoom/pan
- **Remaining**: Dark UI, Space+drag pan, 10%-400% range indicator in bottom-left
- **Prompt**: "Wrap TLdraw canvas in a dark UI, add Cmd+scroll zoom, Space+drag pan, 10%–400% range indicator in bottom-left."

### 1.2 Multi-select Lasso
- **Status**: Not Started
- **Prompt**: "Add polygonal lasso tool; on mouse-up create selection group; show bounding box with corner nudge arrows."

### 1.3 Drag-and-drop Images / Paste from Clipboard
- **Status**: Not Started
- **Prompt**: "Handle onDrop, onPaste; auto-upload to /api/upload; return URL and insert as TLdraw image shape."

### 1.4 Merge / Blend Two Images
- **Status**: Not Started
- **Prompt**: "Right-click any image → 'Blend with…' cursor changes; on second click call /api/blend (Replicate SDXL-img2img mask=0.5) and replace both images with single new layer."

### 1.5 Generative Fill / Erase
- **Status**: Not Started
- **Prompt**: "Add eraser brush; when user paints, send mask + base image to /api/inpaint; stream result back; keep original hidden as backup layer."

### 1.6 Layers Panel
- **Status**: Not Started
- **Prompt**: "Create jotai atom `layersAtom`; sync with TLdraw page shapes; show drag-to-reorder, eyeball toggle, lock, opacity slider."

### 1.7 Undo / Redo (Infinite)
- **Status**: Not Started
- **Prompt**: "Use TLdraw built-in history; expose Cmd-Z / Shift-Cmd-Z in UI; persist stack to IndexedDB on every change."

### 1.8 Export Selections → PNG / SVG / PDF
- **Status**: Not Started
- **Prompt**: "Add export dialog; for PNG use html2canvas on selection bbox; for PDF use pdf-lib; default name `canvas-export-MM-DD-HH-mm`."

---

## 2. POWER TOOLS (Product Hunt Features - Week 2)

### 2.1 Infinite Zoom with Thumbnail Mini-map
- **Status**: Not Started
- **Prompt**: "Render 150×150 mini-map in bottom-right; draw viewport rectangle; click to jump; throttle at 30 fps."

### 2.2 Real-time Multiplayer Cursors
- **Status**: Not Started
- **Prompt**: "Wire TLdraw sync to a cheap WebSocket (y-websocket); show partner cursors with name tags; use Supabase presence."

### 2.3 Version Branches / Named Checkpoints
- **Status**: Not Started
- **Prompt**: "Add branch icon; on click duplicate current page, append timestamp; let user rename; show horizontal list above canvas."

### 2.4 AI Prompt on Any Selected Area
- **Status**: Not Started
- **Prompt**: "When user draws rectangle, show floating input 'Describe this area'; send crop + prompt to /api/outpaint; insert result as new layer."

### 2.5 Style-transfer Hotkey
- **Status**: Not Started
- **Prompt**: "Ctrl+T on any image → modal with 10 style thumbnails (line-art, watercolor, clay, etc.); click to call /api/style-transfer; replace inline."

### 2.6 Remove Background (One-click)
- **Status**: Not Started
- **Prompt**: "Add 'Remove BG' in context menu; call Replicate remove-bg; auto-crop transparent result; hide original."

### 2.7 Smart Upscaler 2× / 4×
- **Status**: Partially Complete (API placeholder exists)
- **Remaining**: Real-ESRGAN integration, progress bar, append '2x' to layer name
- **Prompt**: "Context menu → 'Upscale 2×'; call Real-ESRGAN; show progress bar; append '2x' to layer name."

### 2.8 Text-to-vector (SVG)
- **Status**: Not Started
- **Prompt**: "Add text tool; on Enter call /api/text2svg (svg-maker-lora); insert as TLdraw draw shape so strokes stay editable."

---

## 3. INTERIOR-DESIGN KIT (Week 3)

### 3.1 Dimension Arrow Tool
- **Status**: Not Started
- **Prompt**: "New shape 'MeasureLine'; user clicks start→end; auto compute distance using scaleAtom; render double-arrow + text in ft-in."

### 3.2 Furniture Stamp Library
- **Status**: Not Started
- **Prompt**: "Left tab 'Stamps'; accordion sections (seating, tables, lighting); each thumbnail is 256 px PNG with transparent shadow; drag onto canvas snaps to 1:20 scale."

### 3.3 Material Swatches (Drag-to-fill)
- **Status**: Not Started
- **Prompt**: "Add eyedropper tool; sample any pixel; create 100×100 swatch shape; when dragged onto furniture shape, replace fill texture."

### 3.4 Lighting Overlay Toggle
- **Status**: Not Started
- **Prompt**: "Switch 'Show light pools'; calculate radial gradients from lamp positions; opacity 15%; use canvas overlay layer."

### 3.5 Traffic-flow Arrows
- **Status**: Not Started
- **Prompt**: "Tool 'Draw path'; user clicks waypoints; auto smooth bezier; default width 3 ft (scaleAtom); color #00FF88."

### 3.6 Ruler Grid (Toggle Inches vs Metric)
- **Status**: Not Started
- **Prompt**: "Settings dropdown → imperial/metric; redraw grid labels; store preference in localStorage."

### 3.7 Color Palette Extractor (from Mood Image)
- **Status**: Not Started
- **Prompt**: "Right-click image → 'Extract palette'; run quantized color-thief; create 5 swatch shapes aligned below image."

### 3.8 Budget Sticker (Post-it with Auto-sum)
- **Status**: Not Started
- **Prompt**: "Add sticky note; when user types 123, parse number; keep running total in note footer; update on any furniture cost change."

---

## 4. VE 2024 TRICKS (Week 4)

### 4.1 "Loop" = 4-frame GIF Generator
- **Status**: Not Started
- **Prompt**: "Add context menu item 'Create loop'; show 4-up preview; insert as animated GIF shape."
- **Endpoint**: `POST /api/loop` accepts 1 image + motion direction; returns 320×320 gif; auto-plays on hover.

### 4.2 "Recolor" Slider (Hue Shift in HSL)
- **Status**: Not Started
- **Prompt**: "Add slider in inspector; on change, draw image to offscreen canvas, apply `ctx.filter='hue-rotate('+deg+'deg)'`, replace base64."

### 4.3 "Prompt History" Drawer
- **Status**: Not Started
- **Prompt**: "Store last 20 prompts in localStorage; show drawer on Cmd-P; click to re-run."

### 4.4 "Compare Mode" (A/B Swipe)
- **Status**: Not Started
- **Prompt**: "Select two images → context 'Compare'; create new full-screen component with draggable vertical splitter; hide scrollbars."

---

## 5. CURRENT STATUS

### ✅ Completed
- Basic infinite canvas (4x size with zoom/pan)
- Grid background
- Popup menu for selected items
- Multi-model AI generation (Gemini working)
- Style library (database + API + UI)
- Reference images
- Color adjustments (brightness, contrast, saturation)
- Keyboard shortcuts (copy, paste, duplicate, select all, delete)
- Multi-select (Shift+Click)
- Alignment tools
- Virtual rendering (viewport culling)
- Image optimization (lazy loading)

### 🚧 In Progress
- None currently

### 📋 Next Up (Week 1 Priority)
1. Complete infinite canvas UI (dark theme, Space+drag pan, zoom indicator)
2. Multi-select lasso tool
3. Drag-and-drop / paste from clipboard
4. Layers panel
5. Undo/redo system

---

## 6. SHIPPING ORDER

**Week 1**: 1.1–1.8 (VE parity)  
**Week 2**: 2.1–2.4 (viral features)  
**Week 3**: 3.1–3.5 (interior vertical)  
**Week 4**: 4.1–4.4 (VE 2024 polish)

---

## 7. CURSOR PROMPT CHEAT-SHEET

Copy-paste these prompts directly into Cursor (Cmd-K):

- "Add a tool-button to the top bar that merges the selected two images via 50% SDXL-img2img and replaces them with the result layer."
- "Create a dimension-line shape that snaps to furniture corners and displays real-world feet/inches using the existing scaleAtom."
- "Build a sticky-note component that auto-detects numbers and keeps a live sum in the footer."
- "Add polygonal lasso tool; on mouse-up create selection group; show bounding box with corner nudge arrows."
- "Handle onDrop, onPaste; auto-upload to /api/upload; return URL and insert as TLdraw image shape."

---

**Last Updated**: Based on Visual Electric research + Interior Design workflow analysis

