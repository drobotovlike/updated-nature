import { useSignUp, useAuth } from '@clerk/clerk-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from '../components/Layout'

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { signUp, setActive, isLoaded: signUpLoaded } = useSignUp()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState('')

  // Redirect to dashboard when signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true })
    }
  }, [isSignedIn, isLoaded, navigate])
  
  // If already signed in, redirect to dashboard
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }

  const handleEmailSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })

      console.log('Sign-up result:', result.status, result)
      console.log('Missing fields:', result.missingFields)
      console.log('Unverified fields:', result.unverifiedFields)
      console.log('Verifications:', result.verifications)

      // Check if email verification is required
      if (result.status === 'missing_requirements') {
        // Check what's required
        const unverifiedFields = result.unverifiedFields || []
        
        if (unverifiedFields.includes('email_address')) {
          // User is created but needs email verification
          console.log('User created, preparing email verification...')
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setPendingVerification(true)
        } else if (result.verifications?.captcha?.status === 'unverified') {
          // CAPTCHA is required
          setError('Please complete the CAPTCHA verification above before continuing.')
        } else {
          // Other missing requirements
          console.log('Other requirements missing:', result.missingFields, unverifiedFields)
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setPendingVerification(true)
        }
      } else if (result.status === 'complete') {
        // User is created and verified
        console.log('User created and verified, setting session...')
        await setActive({ session: result.createdSessionId })
        navigate('/dashboard', { replace: true })
      } else {
        // Handle other statuses
        console.log('Unexpected status:', result.status)
        setError(`Unexpected status: ${result.status}. Please try again.`)
      }
    } catch (err) {
      console.error('Sign-up error:', err)
      setError(err.errors?.[0]?.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerification = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code })

      console.log('Verification result:', result.status, result)
      console.log('Missing fields:', result.missingFields)
      console.log('Unverified fields:', result.unverifiedFields)
      console.log('Verifications:', result.verifications)

      if (result.status === 'complete') {
        console.log('Email verified, setting session...')
        await setActive({ session: result.createdSessionId })
        navigate('/dashboard', { replace: true })
      } else if (result.status === 'missing_requirements') {
        // Check what's still required
        const missingFields = result.missingFields || []
        const unverifiedFields = result.unverifiedFields || []
        
        console.log('Still missing:', missingFields, unverifiedFields)
        
        // Check if it's CAPTCHA that's missing
        if (result.verifications?.captcha?.status === 'unverified') {
          setError('CAPTCHA verification required. Please complete the CAPTCHA challenge above.')
        } else if (missingFields.length > 0) {
          setError(`Additional information required: ${missingFields.join(', ')}`)
        } else if (unverifiedFields.length > 0) {
          setError(`Additional verification required: ${unverifiedFields.join(', ')}`)
        } else {
          // Email might be verified, try to complete sign-up
          console.log('Email verified but status not complete, checking session...')
          if (result.createdSessionId) {
            await setActive({ session: result.createdSessionId })
            navigate('/dashboard', { replace: true })
          } else {
            setError('Verification incomplete. Please try again or contact support.')
          }
        }
      } else {
        console.log('Verification incomplete, status:', result.status)
        setError(`Verification status: ${result.status}. Please try again.`)
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError(err.errors?.[0]?.message || 'Invalid verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignUp = async (provider) => {
    setError('')
    setLoading(true)

    try {
      await signUp.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: '/dashboard',
        redirectUrlComplete: '/dashboard',
      })
    } catch (err) {
      setError(err.errors?.[0]?.message || `Failed to sign up with ${provider}.`)
      setLoading(false)
    }
  }

  if (!signUpLoaded) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-text-tertiary">Loading...</div>
        </div>
      </Layout>
    )
  }
  
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <Link to="/" className="text-2xl font-semibold tracking-tight text-text-primary mb-6 inline-block hover:opacity-80 transition-opacity">
              ature studio.
            </Link>
            <h1 className="text-2xl font-semibold text-text-primary mb-2">Create your account</h1>
            <p className="text-text-secondary text-sm">Start designing beautiful interiors with AI</p>
          </div>
          
          {/* Card */}
          <div className="bg-white rounded-lg border border-border shadow-sm p-6">
              {!pendingVerification ? (
                <>
                  {/* Social Login Buttons */}
                  <div className="mb-6 space-y-3">
                    <button
                      onClick={() => handleSocialSignUp('google')}
                      disabled={loading}
                      className="w-full h-10 px-4 border border-border hover:bg-surface-elevated text-text-primary transition-all rounded-lg font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.965-2.184l-2.908-2.258c-.806.54-1.837.86-3.057.86-2.35 0-4.34-1.587-5.053-3.72H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                        <path d="M3.954 10.698c-.18-.54-.282-1.117-.282-1.698s.102-1.158.282-1.698V4.97H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.03l2.997-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.97L3.954 7.302C4.667 5.167 6.657 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </button>
                    <button
                      onClick={() => handleSocialSignUp('apple')}
                      disabled={loading}
                      className="w-full h-10 px-4 border border-border hover:bg-surface-elevated text-text-primary transition-all rounded-lg font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M13.65 4.78c-.1-.65-.45-1.2-1.05-1.65-.55-.4-1.25-.6-2.1-.6-.6 0-1.1.15-1.5.45-.4.3-.65.7-.75 1.2h1.5c.05-.3.2-.55.45-.75.25-.2.55-.3.9-.3.5 0 .9.15 1.2.45.3.3.45.7.45 1.2 0 .35-.1.65-.3.9-.2.25-.45.4-.75.45v1.2c.4-.05.75-.2 1.05-.45.3-.25.5-.6.6-1.05.1-.45.1-.9 0-1.35zm-2.4 8.4c-.3.25-.7.4-1.2.45v-1.2c.3-.05.55-.2.75-.45.2-.25.3-.55.3-.9 0-.5-.15-.9-.45-1.2-.3-.3-.7-.45-1.2-.45-.35 0-.65.1-.9.3-.25.2-.4.45-.45.75H6.25c.1-.5.35-.9.75-1.2.4-.3.9-.45 1.5-.45.85 0 1.55.2 2.1.6.6.45.95 1 1.05 1.65.1.45.1.9 0 1.35-.1.45-.3.8-.6 1.05z"/>
                      </svg>
                      Continue with Apple
                    </button>
                    <button
                      onClick={() => handleSocialSignUp('facebook')}
                      disabled={loading}
                      className="w-full h-10 px-4 border border-border hover:bg-surface-elevated text-text-primary transition-all rounded-lg font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                        <path d="M18 9c0-4.97-4.03-9-9-9S0 4.03 0 9c0 4.42 3.21 8.1 7.42 8.78v-6.21H5.31V9h2.11V7.02c0-2.08 1.24-3.23 3.14-3.23.91 0 1.86.16 1.86.16v2.05h-1.05c-1.03 0-1.35.64-1.35 1.3V9h2.31l-.37 2.57h-1.94v6.21C14.79 17.1 18 13.42 18 9z"/>
                      </svg>
                      Continue with Facebook
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-4 bg-white text-text-tertiary">or</span>
                    </div>
                  </div>

                  {/* Email Form */}
                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-text-primary mb-1.5">
                          First name
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full h-10 px-3 border border-border focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 rounded-lg bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-text-primary mb-1.5">
                          Last name
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full h-10 px-3 border border-border focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 rounded-lg bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                          placeholder="Last name"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-10 px-3 border border-border focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 rounded-lg bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1.5">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full h-10 px-3 border border-border focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 rounded-lg bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                        placeholder="Create a password"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    {/* Clerk CAPTCHA container for bot protection */}
                    <div id="clerk-captcha" className="flex justify-center"></div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-10 bg-primary-400 hover:bg-primary-300 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                    >
                      {loading ? 'Creating account...' : 'Continue'}
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={handleVerification} className="space-y-4">
                  <div>
                    <p className="text-sm text-text-secondary mb-4">
                      We've sent a verification code to <strong className="text-text-primary">{email}</strong>. Please enter it below.
                    </p>
                    <label htmlFor="code" className="block text-sm font-medium text-text-primary mb-1.5">
                      Verification Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      className="w-full h-10 px-3 border border-border focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 rounded-lg bg-white text-text-primary placeholder:text-text-tertiary text-sm transition-all"
                      placeholder="Enter verification code"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 bg-primary-400 hover:bg-primary-300 text-white rounded-lg font-medium shadow-sm hover:shadow transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingVerification(false)}
                    className="w-full text-text-secondary hover:text-text-primary text-sm transition-colors"
                  >
                    Back to sign up
                  </button>
                </form>
              )}
          </div>
          
          {/* Footer link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
            Already have an account?{' '}
              <Link to="/sign-in" className="text-text-primary font-medium hover:text-primary-400 transition-colors inline-flex items-center gap-1">
              Sign in
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
            </Link>
          </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
