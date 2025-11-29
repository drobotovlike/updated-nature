import { useSyncedStore } from '@syncedstore/react';
import { store } from '../collaboration/store';

/**
 * Hook to access the shared Yjs store
 * Returns a reactive proxy of the store state
 */
export const useYjsStore = () => {
  return useSyncedStore(store);
};

// Helper functions for common mutations
// These can be used inside or outside components

export const addItem = (item) => {
  store.items.push(item);
};

export const updateItem = (id, updates) => {
  const index = store.items.findIndex(item => item.id === id);
  if (index !== -1) {
    // SyncedStore allows direct mutation of properties
    const item = store.items[index];
    Object.assign(item, updates);
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
  // Add new items
  store.items.push(...items);
};

