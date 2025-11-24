import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
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

try {
  const root = createRoot(document.getElementById('root'))
  
  // Always wrap with ClerkProvider to prevent hook errors
  // ClerkProvider requires a non-empty string, so we use a placeholder if missing
  // This allows the app to render and show proper error messages
  const clerkKey = PUBLISHABLE_KEY || 'pk_test_placeholder_key_set_vite_clerk_publishable_key_in_vercel'
  
  if (!PUBLISHABLE_KEY) {
    console.error('❌ VITE_CLERK_PUBLISHABLE_KEY is not set!')
    console.error('')
    console.error('To fix this:')
    console.error('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables')
    console.error('2. Add environment variable:')
    console.error('   Name: VITE_CLERK_PUBLISHABLE_KEY')
    console.error('   Value: Your Clerk publishable key (starts with pk_test_ or pk_live_)')
    console.error('   Environment: Production, Preview, Development (select all)')
    console.error('3. Redeploy your application')
    console.error('')
    console.error('Get your key at: https://dashboard.clerk.com/last-active?path=api-keys')
  } else if (!PUBLISHABLE_KEY.startsWith('pk_test_') && !PUBLISHABLE_KEY.startsWith('pk_live_')) {
    console.warn('⚠️ Clerk key format appears invalid. Should start with pk_test_ or pk_live_')
  }
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={clerkKey}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>
  )
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
