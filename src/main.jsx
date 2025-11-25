import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'

// Get Clerk publishable key from environment variable
// For development, you can set this in .env.local file
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  console.warn('⚠️ VITE_CLERK_PUBLISHABLE_KEY is not set. Authentication will not work.')
  console.warn('Please create a .env.local file with: VITE_CLERK_PUBLISHABLE_KEY=pk_test_...')
  console.warn('You can get your key at: https://dashboard.clerk.com/last-active?path=api-keys')
}

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message || 'An error occurred'}</p>
          <button onClick={() => window.location.reload()}>Reload Page</button>
          <details style={{ marginTop: '20px' }}>
            <summary>Error Details</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
              {this.state.error?.stack}
            </pre>
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

// Component to show when Clerk key is missing
function MissingClerkKeyError() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#fafafa'
    }}>
      <div style={{ 
        maxWidth: '600px', 
        background: 'white', 
        padding: '40px', 
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
          ⚠️ Missing Clerk Configuration
        </h1>
        <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
          The <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>VITE_CLERK_PUBLISHABLE_KEY</code> environment variable is not set in Vercel.
        </p>
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a' }}>
            To fix this:
          </h2>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#666', lineHeight: '1.8' }}>
            <li>Go to <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3' }}>Vercel Dashboard</a> → Your Project</li>
            <li>Navigate to <strong>Settings</strong> → <strong>Environment Variables</strong></li>
            <li>Add a new variable:
              <ul style={{ marginTop: '8px', marginBottom: 0 }}>
                <li><strong>Name:</strong> <code>VITE_CLERK_PUBLISHABLE_KEY</code></li>
                <li><strong>Value:</strong> Your Clerk publishable key (starts with <code>pk_test_</code> or <code>pk_live_</code>)</li>
                <li><strong>Environment:</strong> Select all (Production, Preview, Development)</li>
              </ul>
            </li>
            <li>Click <strong>Save</strong> and <strong>Redeploy</strong> your application</li>
          </ol>
        </div>
        <div style={{ marginTop: '24px' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Get your Clerk key from:
          </p>
          <a 
            href="https://dashboard.clerk.com/last-active?path=api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-block',
              padding: '10px 20px', 
              background: '#0070f3', 
              color: 'white', 
              textDecoration: 'none', 
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            Clerk Dashboard → API Keys
          </a>
        </div>
      </div>
    </div>
  )
}

try {
  const root = createRoot(document.getElementById('root'))
  
  // Check if Clerk key is valid
  const isValidKey = PUBLISHABLE_KEY && 
    (PUBLISHABLE_KEY.startsWith('pk_test_') || PUBLISHABLE_KEY.startsWith('pk_live_'))
  
  if (!isValidKey) {
    console.error('❌ VITE_CLERK_PUBLISHABLE_KEY is missing or invalid!')
    console.error('')
    console.error('To fix this in Vercel:')
    console.error('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
    console.error('2. Add: VITE_CLERK_PUBLISHABLE_KEY = your_key_here')
    console.error('3. Redeploy your application')
    console.error('')
    
    // Show error page without ClerkProvider (error page doesn't use Clerk hooks)
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <MissingClerkKeyError />
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>
    )
  } else {
    // Render app with ClerkProvider when key is valid
    // ClerkProvider must wrap the app for hooks like useAuth() to work
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
            <BrowserRouter>
              <App />
              <Analytics />
            </BrowserRouter>
          </ClerkProvider>
        </ErrorBoundary>
      </StrictMode>
    )
  }
} catch (error) {
  console.error('Failed to render app:', error)
  const rootEl = document.getElementById('root')
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; font-family: system-ui;">
        <h1>Failed to load application</h1>
        <p>${error.message}</p>
        <pre>${error.stack}</pre>
      </div>
    `
  }
}
