import { SignIn, useAuth } from '@clerk/clerk-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '../components/Layout'

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()
  
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
  
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-stone-100/30 rounded-full blur-3xl -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-stone-100/30 rounded-full blur-3xl translate-y-1/2"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Header - Centered with better typography */}
          <div className="mb-12 text-center reveal-element">
            <Link to="/" className="text-3xl md:text-4xl font-bold tracking-tight text-stone-900 mb-4 inline-block hover:opacity-80 transition-opacity">
              ature studio.
            </Link>
            <h1 className="text-2xl md:text-3xl font-serif-ature font-semibold text-stone-900 mb-2">Welcome back</h1>
            <p className="text-stone-500 text-base">Sign in to continue to your workspace</p>
          </div>
          
          {/* Card - Enhanced with better shadows and spacing */}
          <div className="bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-200/80 p-8 md:p-10 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-50/50 via-transparent to-stone-50/30 pointer-events-none"></div>
            <div className="relative z-10">
            <SignIn
              appearance={{
                baseTheme: undefined,
                elements: {
                  rootBox: 'w-full m-0 p-0',
                  card: 'shadow-none border-0 bg-transparent p-0 m-0',
                  cardBox: 'shadow-none border-0 bg-transparent p-0 m-0 w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlock: 'p-0 m-0 mb-8',
                  socialButtonsBlockButton: 'border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-900 transition-all rounded-full font-medium w-full mb-3 last:mb-0 h-12 px-4 overflow-hidden',
                  socialButtonsBlockButtonText: 'text-stone-900 font-medium text-sm',
                  socialButtonsBlockButtonArrow: 'hidden',
                  dividerLine: 'bg-stone-200 my-8',
                  dividerText: 'text-stone-500 text-xs px-4 bg-white',
                  formField: 'p-0 m-0 mb-5',
                  formFieldLabel: 'text-stone-700 font-medium text-sm mb-2',
                  formFieldInput: 'border border-stone-200 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 h-12 px-4 text-sm w-full',
                  formButtonPrimary: 'bg-stone-900 hover:bg-stone-800 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all w-full mb-8 h-12 text-sm overflow-hidden !rounded-full',
                  formButtonPrimaryArrow: 'hidden',
                  formButtonReset: 'text-stone-600 hover:text-stone-900 text-sm',
                  footerActionLink: 'text-stone-900 hover:text-stone-700 font-semibold text-sm',
                  footerAction: 'p-0 m-0 text-center',
                  formFieldErrorText: 'text-red-600 text-xs mt-1.5',
                  identityPreviewText: 'text-stone-900',
                  identityPreviewEditButton: 'text-stone-600 hover:text-stone-900',
                  formResendCodeLink: 'text-stone-900 hover:text-stone-700 font-semibold text-sm',
                  otpCodeFieldInput: 'border border-stone-200 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 rounded-lg h-12',
                  alertText: 'text-stone-600 text-sm',
                  formHeaderTitle: 'text-stone-900 font-serif-ature text-2xl font-semibold',
                  formHeaderSubtitle: 'text-stone-500 text-sm',
                  footer: 'hidden',
                  footerPages: 'hidden',
                },
                variables: {
                  colorPrimary: '#0c0a09',
                  colorText: '#0c0a09',
                  colorTextSecondary: '#78716c',
                  colorBackground: '#ffffff',
                  colorInputBackground: '#ffffff',
                  colorInputText: '#0c0a09',
                  borderRadius: '9999px',
                  fontFamily: "'Manrope', 'Helvetica', system-ui, sans-serif",
                  fontFamilyButtons: "'Manrope', 'Helvetica', system-ui, sans-serif",
                },
              }}
              routing="hash"
              signUpUrl="/sign-up"
              afterSignInUrl="/dashboard"
            />
            </div>
          </div>
          
          {/* Footer link - Enhanced styling */}
          <div className="mt-8 text-center">
            <p className="text-sm text-stone-500">
              Don't have an account?{' '}
              <Link to="/sign-up" className="text-stone-900 font-semibold hover:text-stone-700 transition-colors inline-flex items-center gap-1 group">
                Sign up
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

