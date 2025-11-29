import { syncedStore, getYjsValue } from "@syncedstore/core";

// Define the shape of our shared state
// SyncedStore automatically handles the Yjs types (Y.Map, Y.Array, etc.)
export const store = syncedStore({
  // The main items array - order determines rendering order (z-index)
  items: [], 
  
  // Shared canvas settings (background, etc.)
  settings: {
    backgroundColor: '#F0F2F5',
    gridEnabled: true,
  },
  
  // Metadata about the project (name, etc.)
  project: {
    name: 'Untitled Project',
  }
});

// Helper to get the underlying Yjs document if needed
export const doc = getYjsValue(store);

