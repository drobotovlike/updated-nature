import { useSyncExternalStore, useCallback, useRef } from 'react';
import { store } from '../collaboration/store';
import { getYjsValue } from '@syncedstore/core';

/**
 * Hook to access the shared Yjs store
 * Compatible with React 19 (replaces @syncedstore/react which has compatibility issues)
 * 
 * Returns the store proxy - changes to the store will trigger re-renders
 */
export const useYjsStore = () => {
  const doc = getYjsValue(store);
  const versionRef = useRef(0);
  
  const subscribe = useCallback((callback) => {
    const handler = () => {
      versionRef.current++;
      callback();
    };
    
    doc.on('update', handler);
    return () => doc.off('update', handler);
  }, [doc]);
  
  const getSnapshot = useCallback(() => {
    // Return a new object reference when doc updates to trigger re-render
    // The actual data is accessed via the store proxy
    return versionRef.current;
  }, []);
  
  // Subscribe to Yjs doc updates
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  
  // Return the store proxy - it's always the same reference but its contents change
  return store;
};

// Helper to deep clone an object to avoid Yjs "already in tree" errors
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

// Helper functions for common mutations
// These can be used inside or outside components

export const addItem = (item) => {
  // Deep clone to ensure we're not adding an object already in the Yjs tree
  const clonedItem = deepClone(item);
  store.items.push(clonedItem);
};

export const updateItem = (id, updates) => {
  const index = store.items.findIndex(item => item.id === id);
  if (index !== -1) {
    // SyncedStore allows direct mutation of properties
    // Deep clone updates to avoid "already in tree" errors
    const clonedUpdates = deepClone(updates);
    const item = store.items[index];
    Object.assign(item, clonedUpdates);
  }
};

export const deleteItem = (id) => {
  const index = store.items.findIndex(item => item.id === id);
  if (index !== -1) {
    store.items.splice(index, 1);
  }
};

export const deleteItems = (ids) => {
  // Sort indices descending to avoid shifting issues when splicing
  const idSet = new Set(ids);
  // We need to find indices first
  const indices = [];
  store.items.forEach((item, index) => {
    if (idSet.has(item.id)) {
      indices.push(index);
    }
  });
  
  // Sort descending
  indices.sort((a, b) => b - a);
  
  // Remove
  indices.forEach(index => {
    store.items.splice(index, 1);
  });
};

export const setItems = (items) => {
  // Clear array
  store.items.splice(0, store.items.length);
  // Deep clone each item to avoid "already in tree" errors
  const clonedItems = items.map(deepClone);
  store.items.push(...clonedItems);
};

