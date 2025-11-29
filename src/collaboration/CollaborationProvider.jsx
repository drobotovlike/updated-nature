import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseProvider } from 'y-supabase';
import { IndexeddbPersistence } from 'y-indexeddb';
import { store } from './store';
import { getYjsValue } from '@syncedstore/core';
import { supabase } from '../utils/supabaseClient';

const CollaborationContext = createContext(null);

export const useCollaboration = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
};

export const CollaborationProvider = ({ children, roomId = 'ature-demo-room' }) => {
  const [provider, setProvider] = useState(null);
  const [awareness, setAwareness] = useState(null);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (!roomId) return;

    // Get the underlying Yjs document from SyncedStore
    const doc = getYjsValue(store);

    // 1. Setup Local Persistence (Local-First)
    // This loads data from IndexedDB immediately
    const indexeddbProvider = new IndexeddbPersistence(roomId, doc);
    
    indexeddbProvider.on('synced', () => {
      console.log('Content loaded from local database');
    });

    // 2. Setup Supabase Provider (Sync Layer)
    // Connects to Supabase Realtime for multiplayer sync
    const supabaseProvider = new SupabaseProvider(doc, supabase, {
      channel: `room-${roomId}`,
      // type: 'broadcast', // 'broadcast' or 'presence' (default)
      // resyncInterval: 5000,
    });

    supabaseProvider.on('status', (event) => {
      console.log('Supabase Provider Status:', event.status);
      setStatus(event.status); // 'connected' or 'disconnected'
    });

    // Handle awareness (presence)
    setAwareness(supabaseProvider.awareness);
    setProvider(supabaseProvider);

    return () => {
      supabaseProvider.destroy();
      indexeddbProvider.destroy();
    };
  }, [roomId]);

  const value = {
    store,
    provider,
    awareness,
    status
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

