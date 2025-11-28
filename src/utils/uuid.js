/**
 * UUID Generation and Validation Utilities
 * 
 * Always use UUIDs for project IDs, even for local projects.
 * This ensures consistency and enables canvas features immediately.
 */

/**
 * Generate RFC4122 version 4 UUID
 * Always use this for project IDs, even for local projects
 * @returns {string} UUID v4 string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Validate UUID format
 * @param {string} str - String to validate
 * @returns {boolean} True if valid UUID format
 */
export function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return UUID_REGEX.test(str)
}

