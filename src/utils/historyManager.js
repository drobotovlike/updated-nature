// History Manager for Canvas - Uses IndexedDB for persistence
const DB_NAME = 'ature-canvas-history'
const DB_VERSION = 1
const STORE_NAME = 'history'

let db = null

// Initialize IndexedDB
async function initDB(projectId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${DB_NAME}-${projectId}`, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Save history state to IndexedDB
export async function saveHistoryToDB(projectId, historyState) {
  try {
    if (!db) await initDB(projectId)
    
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    // Clear old entries (keep last 100)
    const getAllRequest = store.getAll()
    await new Promise((resolve, reject) => {
      getAllRequest.onsuccess = async () => {
        const allEntries = getAllRequest.result
        if (allEntries.length >= 100) {
          // Delete oldest entries
          const toDelete = allEntries.slice(0, allEntries.length - 99)
          for (const entry of toDelete) {
            await new Promise((res, rej) => {
              const deleteRequest = store.delete(entry.id)
              deleteRequest.onsuccess = () => res()
              deleteRequest.onerror = () => rej(deleteRequest.error)
            })
          }
        }
        resolve()
      }
      getAllRequest.onerror = () => reject(getAllRequest.error)
    })
    
    // Add new entry
    await new Promise((resolve, reject) => {
      const addRequest = store.add({
        timestamp: Date.now(),
        state: historyState,
      })
      addRequest.onsuccess = () => resolve()
      addRequest.onerror = () => reject(addRequest.error)
    })
  } catch (error) {
    console.error('Error saving history to IndexedDB:', error)
  }
}

// Load history state from IndexedDB
export async function loadHistoryFromDB(projectId) {
  try {
    if (!db) await initDB(projectId)
    
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const getAllRequest = store.getAll()
    
    return new Promise((resolve, reject) => {
      getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result
        if (entries.length === 0) {
          resolve(null)
          return
        }
        
        // Get the most recent entry
        const latest = entries.sort((a, b) => b.timestamp - a.timestamp)[0]
        resolve(latest?.state || null)
      }
      getAllRequest.onerror = () => reject(getAllRequest.error)
    })
  } catch (error) {
    console.error('Error loading history from IndexedDB:', error)
    return null
  }
}

// Clear history for a project
export async function clearHistory(projectId) {
  try {
    if (!db) await initDB(projectId)
    
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const clearRequest = store.clear()
    
    return new Promise((resolve, reject) => {
      clearRequest.onsuccess = () => resolve()
      clearRequest.onerror = () => reject(clearRequest.error)
    })
  } catch (error) {
    console.error('Error clearing history:', error)
  }
}

