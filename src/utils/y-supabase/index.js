/**
 * @module SupabaseProvider
 */

import * as Y from 'yjs'
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness'
import { Observable } from 'lib0/observable'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { writeUpdate, readSyncMessage, writeSyncStep1 } from 'y-protocols/sync'

const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3

/**
 * @typedef {Object} SupabaseProviderOptions
 * @property {string} [channel] - Name of the Supabase Realtime channel
 * @property {number} [resyncInterval] - Interval in ms for resyncing
 * @property {boolean} [awareness] - Whether to use awareness
 */

/**
 * Supabase Provider for Yjs
 * Connects Yjs to Supabase Realtime
 */
export class SupabaseProvider extends Observable {
  /**
   * @param {Y.Doc} doc
   * @param {Object} supabase - Supabase client instance
   * @param {SupabaseProviderOptions} [options]
   */
  constructor(doc, supabase, { channel = 'default', resyncInterval = 5000, awareness = new Awareness(doc) } = {}) {
    super()

    this.doc = doc
    this.supabase = supabase
    this.channelName = channel
    this.awareness = awareness
    this.connected = false
    
    // Create channel
    this.channel = this.supabase.channel(this.channelName)

    this.channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        this.onMessage(new Uint8Array(payload))
      })
      .on('presence', { event: 'sync' }, () => {
        // Handle presence sync if needed
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Handle join
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Handle leave
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.connected = true
          this.emit('status', [{ status: 'connected' }])
          // Start sync
          this.sendSyncStep1()
          if (this.awareness.getLocalState() !== null) {
            const awarenessUpdate = encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
            this.sendAwarenessUpdate(awarenessUpdate)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.connected = false
          this.emit('status', [{ status: 'disconnected' }])
        }
      })

    // Listen to Yjs updates
    this.doc.on('update', this.onUpdate.bind(this))
    this.awareness.on('update', this.onAwarenessUpdate.bind(this))

    // Resync interval
    if (resyncInterval > 0) {
      this.resyncInterval = setInterval(() => {
        if (this.connected) {
          this.sendSyncStep1()
        }
      }, resyncInterval)
    }
  }

  /**
   * @param {Uint8Array} update
   * @param {any} origin
   */
  onUpdate(update, origin) {
    if (origin !== this) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, messageSync)
      writeUpdate(encoder, update)
      this.broadcast(encoding.toUint8Array(encoder))
    }
  }

  /**
   * @param {any} { added, updated, removed }
   * @param {any} origin
   */
  onAwarenessUpdate({ added, updated, removed }, origin) {
    const changedClients = added.concat(updated).concat(removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(this.awareness, changedClients))
    this.broadcast(encoding.toUint8Array(encoder))
  }

  /**
   * @param {Uint8Array} message
   */
  onMessage(message) {
    const decoder = decoding.createDecoder(message)
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case messageSync:
        encoding.writeVarUint(encoding.createEncoder(), messageSync)
        readSyncMessage(decoder, encoding.createEncoder(), this.doc, this)
        break
      case messageAwareness:
        applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), this)
        break
      default:
        console.error('Unknown message type:', messageType)
    }
  }

  sendSyncStep1() {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    writeSyncStep1(encoder, this.doc)
    this.broadcast(encoding.toUint8Array(encoder))
  }

  sendAwarenessUpdate(update) {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(encoder, update)
    this.broadcast(encoding.toUint8Array(encoder))
  }

  /**
   * @param {Uint8Array} message
   */
  broadcast(message) {
    if (this.connected) {
      // Supabase Realtime expects standard arrays or objects, not Uint8Array directly in some versions
      // Converting to regular array for safety
      this.channel.send({
        type: 'broadcast',
        event: 'message',
        payload: Array.from(message),
      })
    }
  }

  destroy() {
    this.resyncInterval && clearInterval(this.resyncInterval)
    this.doc.off('update', this.onUpdate)
    this.awareness.off('update', this.onAwarenessUpdate)
    this.supabase.removeChannel(this.channel)
    this.removeAllListeners()
  }
}

