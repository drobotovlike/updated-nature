/**
 * Database Migration Checker
 * 
 * Ensures required database tables and columns exist before operations.
 * Provides helpful error messages if migrations haven't been run.
 */

import { logger } from './logger.js'

/**
 * Check if a table exists in the database
 */
export async function checkTableExists(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    // If no error or error is "no rows", table exists
    return !error || error.code === 'PGRST116'
  } catch (error) {
    return false
  }
}

/**
 * Check if required tables exist
 */
export async function checkRequiredTables(supabase) {
  const requiredTables = [
    { name: 'projects', migration: 'database-schema.sql' },
    { name: 'spaces', migration: 'database-schema.sql' },
    { name: 'project_files', migration: 'database-schema.sql' },
    { name: 'assets', migration: 'database-schema.sql' }
  ]
  
  const missing = []
  
  for (const table of requiredTables) {
    const exists = await checkTableExists(supabase, table.name)
    if (!exists) {
      missing.push(table)
    }
  }
  
  return { allExist: missing.length === 0, missing }
}

/**
 * Check if canvas tables exist (optional feature)
 */
export async function checkCanvasTables(supabase) {
  const canvasTables = [
    { name: 'canvas_items', migration: 'database-canvas-migration.sql' },
    { name: 'canvas_states', migration: 'database-canvas-migration.sql' }
  ]
  
  const missing = []
  
  for (const table of canvasTables) {
    const exists = await checkTableExists(supabase, table.name)
    if (!exists) {
      missing.push(table)
    }
  }
  
  return { allExist: missing.length === 0, missing }
}

/**
 * Get helpful error message for missing tables
 */
export function getMigrationError(missingTables) {
  const tableNames = missingTables.map(t => t.name).join(', ')
  const migrations = [...new Set(missingTables.map(t => t.migration))].join(', ')
  
  return {
    error: 'Database tables not found',
    message: `Required tables are missing: ${tableNames}`,
    code: 'TABLES_NOT_FOUND',
    instructions: [
      'Please run the following migrations in your Supabase SQL Editor:',
      `1. ${migrations}`,
      '2. Refresh this page',
      '',
      'You can find these files in the project root directory.',
      'Copy their contents and run them in: Supabase Dashboard → SQL Editor → New Query'
    ].join('\n')
  }
}

/**
 * Middleware to check database setup
 */
export function checkDatabaseSetup(supabase) {
  let setupChecked = false
  let setupValid = false
  
  return async (req, res, next) => {
    // Only check once per server instance
    if (setupChecked) {
      if (!setupValid) {
        const { missing } = await checkRequiredTables(supabase)
        return res.status(500).json(getMigrationError(missing))
      }
      return next()
    }
    
    // Check database setup
    const { allExist, missing } = await checkRequiredTables(supabase)
    setupChecked = true
    setupValid = allExist
    
    if (!allExist) {
      logger.error('Database migration check failed', { missing: missing.map(t => t.name) })
      return res.status(500).json(getMigrationError(missing))
    }
    
    logger.info('Database setup verified', { tables: 'all required tables exist' })
    return next()
  }
}

/**
 * Handle canvas-specific table checks (non-fatal)
 */
export async function handleCanvasOperation(supabase, operation) {
  const { allExist, missing } = await checkCanvasTables(supabase)
  
  if (!allExist) {
    logger.warn('Canvas tables not found', { 
      missing: missing.map(t => t.name),
      operation 
    })
    
    return {
      success: false,
      error: {
        code: 'CANVAS_TABLES_NOT_FOUND',
        message: 'Canvas feature requires additional database setup',
        instructions: 'Run database-canvas-migration.sql in Supabase SQL Editor',
        canContinue: true // Non-fatal, app can work without canvas
      }
    }
  }
  
  return { success: true }
}

/**
 * Check and log database status on startup
 */
export async function logDatabaseStatus(supabase) {
  logger.info('Checking database status...')
  
  // Check required tables
  const { allExist: requiredExist, missing: requiredMissing } = await checkRequiredTables(supabase)
  
  if (!requiredExist) {
    logger.error('❌ Required database tables missing!', { 
      missing: requiredMissing.map(t => t.name)
    })
    logger.error('Run database-schema.sql in Supabase SQL Editor')
    return false
  }
  
  logger.info('✅ Required database tables verified')
  
  // Check optional canvas tables
  const { allExist: canvasExist, missing: canvasMissing } = await checkCanvasTables(supabase)
  
  if (!canvasExist) {
    logger.warn('⚠️  Canvas tables not found (optional feature)', {
      missing: canvasMissing.map(t => t.name)
    })
    logger.info('Run database-canvas-migration.sql to enable canvas feature')
  } else {
    logger.info('✅ Canvas tables verified')
  }
  
  return true
}

