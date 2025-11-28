
import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
try {
    const envPath = path.join(__dirname, '.env.local')
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8')
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/)
            if (match) {
                const key = match[1].trim()
                const value = match[2].trim().replace(/^["']|["']$/g, '')
                process.env[key] = value
            }
        })
        console.log('✅ Loaded environment variables from .env.local')
    } else {
        console.warn('⚠️ .env.local file not found')
    }
} catch (error) {
    console.error('Error loading .env.local:', error)
}

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Helper to wrap Vercel-style handlers for Express
const wrapHandler = (handler) => async (req, res) => {
    try {
        await handler(req, res)
    } catch (error) {
        console.error('API Error:', error)
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Internal Server Error' })
        }
    }
}

// Register API routes
// We need to dynamically import the handlers
const apiDir = path.join(__dirname, 'api')

// Generic route handler for /api/*
app.all('/api/:route*', async (req, res) => {
    const { route } = req.params
    const remainder = req.params[0] || ''
    const fullPath = path.join(apiDir, route, remainder)

    // Try to find index.js in the directory
    let handlerPath = path.join(fullPath, 'index.js')

    // If not found, try adding .js extension (e.g. /api/generate.js)
    if (!fs.existsSync(handlerPath)) {
        handlerPath = path.join(apiDir, route + remainder + '.js')
    }

    // If still not found, try just the route (e.g. /api/generate)
    if (!fs.existsSync(handlerPath)) {
        handlerPath = path.join(apiDir, route, 'index.js')
    }

    if (fs.existsSync(handlerPath)) {
        try {
            const module = await import(handlerPath)
            const handler = module.default
            if (typeof handler === 'function') {
                await wrapHandler(handler)(req, res)
            } else {
                res.status(500).json({ error: 'Invalid API handler' })
            }
        } catch (error) {
            console.error(`Error loading handler for ${req.path}:`, error)
            res.status(500).json({ error: 'Failed to load API handler' })
        }
    } else {
        res.status(404).json({ error: 'API route not found' })
    }
})

app.listen(PORT, () => {
    console.log(`
🚀 API Server running at http://localhost:${PORT}
   - /api/generate available
   - /api/projects available
   - /api/spaces available
  `)
})
