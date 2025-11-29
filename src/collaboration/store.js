import { syncedStore, getYjsValue } from "@syncedstore/core";

// Define the shape of our shared state
// SyncedStore requires the root to be {} with type declarations only
// Use [] for Y.Array, {} for Y.Map - do NOT pre-populate with values
export const store = syncedStore({
  // The main items array - order determines rendering order (z-index)
  items: [],
  
  // Shared canvas settings (will be a Y.Map)
  settings: {},
  
  // Metadata about the project (will be a Y.Map)
  project: {}
});

// Default values - applied when store is first accessed if empty
export const DEFAULT_SETTINGS = {
  backgroundColor: '#F0F2F5',
  gridEnabled: true,
};

export const DEFAULT_PROJECT = {
  name: 'Untitled Project',
};

// Helper to get the underlying Yjs document if needed
export const doc = getYjsValue(store);

// Initialize defaults if store is empty (call this after provider connects)
export const initializeDefaults = () => {
  if (store.settings.backgroundColor === undefined) {
    store.settings.backgroundColor = DEFAULT_SETTINGS.backgroundColor;
  }
  if (store.settings.gridEnabled === undefined) {
    store.settings.gridEnabled = DEFAULT_SETTINGS.gridEnabled;
  }
  if (store.project.name === undefined) {
    store.project.name = DEFAULT_PROJECT.name;
  }
};

