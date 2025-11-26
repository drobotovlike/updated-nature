import { SignUp, useAuth } from '@clerk/clerk-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from '../components/Layout'

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const navigate = useNavigate()
  
  // Redirect to dashboard when signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true })
    }
  }, [isSignedIn, isLoaded, navigate])

  // Force fix button styles after Clerk renders
  useEffect(() => {
    const fixButtonStyles = () => {
      // Find all Clerk buttons
      const buttons = document.querySelectorAll(
        '.cl-formButtonPrimary, .cl-socialButtonsBlockButton, [class*="cl-formButton"], [class*="cl-socialButton"]'
      )
      
      buttons.forEach((button) => {
        if (button instanceof HTMLElement) {
          // Remove clip-path
          button.style.clipPath = 'none'
          button.style.webkitClipPath = 'none'
          button.style.borderRadius = '9999px'
          button.style.overflow = 'hidden'
          
          // Remove all pseudo-elements
          const style = document.createElement('style')
          style.textContent = `
            ${button.className.split(' ').map(cls => `.${cls}::before, .${cls}::after`).join(', ')} {
              display: none !important;
              content: none !important;
            }
          `
          document.head.appendChild(style)
          
          // Fix all child elements
          const children = button.querySelectorAll('*')
          children.forEach((child) => {
            if (child instanceof HTMLElement) {
              child.style.clipPath = 'none'
              child.style.webkitClipPath = 'none'
            }
          })
        }
      })
    }

    // Run immediately and also after a delay to catch dynamically loaded buttons
    fixButtonStyles()
    const timer1 = setTimeout(fixButtonStyles, 100)
    const timer2 = setTimeout(fixButtonStyles, 500)
    const timer3 = setTimeout(fixButtonStyles, 1000)

    // Use MutationObserver to catch buttons added dynamically
    const observer = new MutationObserver(() => {
      fixButtonStyles()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      observer.disconnect()
    }
  }, [])
  
  // If already signed in, redirect to dashboard
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }
  
  return (
    <Layout>
      <style>{`
        /* Force remove all button cuts with maximum specificity */
        .cl-formButtonPrimary,
        .cl-socialButtonsBlockButton,
        button.cl-formButtonPrimary,
        button.cl-socialButtonsBlockButton,
        [class*="cl-formButtonPrimary"],
        [class*="cl-socialButtonsBlockButton"],
        [class*="cl-formButton"],
        [class*="cl-socialButton"] {
          clip-path: none !important;
          -webkit-clip-path: none !important;
          border-radius: 9999px !important;
          overflow: hidden !important;
          border-top-left-radius: 9999px !important;
          border-top-right-radius: 9999px !important;
          border-bottom-left-radius: 9999px !important;
          border-bottom-right-radius: 9999px !important;
        }
        .cl-formButtonPrimary::before,
        .cl-formButtonPrimary::after,
        .cl-socialButtonsBlockButton::before,
        .cl-socialButtonsBlockButton::after,
        .cl-formButtonPrimary *::before,
        .cl-formButtonPrimary *::after,
        .cl-socialButtonsBlockButton *::before,
        .cl-socialButtonsBlockButton *::after,
        [class*="cl-formButton"]::before,
        [class*="cl-formButton"]::after,
        [class*="cl-socialButton"]::before,
        [class*="cl-socialButton"]::after {
          display: none !important;
          content: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
        }
        .cl-formButtonPrimary *,
        .cl-socialButtonsBlockButton *,
        [class*="cl-formButton"] *,
        [class*="cl-socialButton"] * {
          clip-path: none !important;
          -webkit-clip-path: none !important;
        }
      `}</style>
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
            <h1 className="text-2xl md:text-3xl font-serif-ature font-semibold text-stone-900 mb-2">Create your account</h1>
            <p className="text-stone-500 text-base">Start designing beautiful interiors with AI</p>
          </div>
          
          {/* Card - Enhanced with better shadows and spacing */}
          <div className="bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-2xl shadow-stone-200/50 border border-stone-200/80 p-8 md:p-10 relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-50/50 via-transparent to-stone-50/30 pointer-events-none"></div>
            <div className="relative z-10">
            <SignUp
              routing="hash"
              signInUrl="/sign-in"
              afterSignUpUrl="/dashboard"
              appearance={{
                baseTheme: undefined,
                elements: {
                  rootBox: 'w-full m-0 p-0',
                  card: 'shadow-none border-0 bg-transparent p-0 m-0',
                  cardBox: 'shadow-none border-0 bg-transparent p-0 m-0 w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlock: 'p-0 m-0 mb-8',
                  socialButtonsBlockButton: 'border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-900 transition-all rounded-full font-medium w-full mb-3 last:mb-0 h-12 px-4 overflow-hidden !rounded-full',
                  socialButtonsBlockButtonText: 'text-stone-900 font-medium text-sm',
                  socialButtonsBlockButtonArrow: 'hidden',
                  socialButtonsBlockButtonIcon: 'hidden',
                  dividerLine: 'bg-stone-200 my-8',
                  dividerText: 'text-stone-500 text-xs px-4 bg-white',
                  formField: 'p-0 m-0 mb-5',
                  formFieldLabel: 'text-stone-700 font-medium text-sm mb-2',
                  formFieldInput: 'border border-stone-200 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 h-12 px-4 text-sm w-full',
                  formButtonPrimary: 'bg-stone-900 hover:bg-stone-800 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all w-full mb-8 h-12 text-sm overflow-hidden !rounded-full',
                  formButtonPrimaryArrow: 'hidden',
                  formButtonPrimaryIcon: 'hidden',
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
            />
            </div>
          </div>
          
          {/* Footer link - Enhanced styling */}
          <div className="mt-8 text-center">
            <p className="text-sm text-stone-500">
              Already have an account?{' '}
              <Link to="/sign-in" className="text-stone-900 font-semibold hover:text-stone-700 transition-colors inline-flex items-center gap-1 group">
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

