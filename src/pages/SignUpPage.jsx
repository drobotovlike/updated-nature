import { SignUp, useAuth } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'

export default function SignUpPage() {
  const { isSignedIn } = useAuth()
  
  // If already signed in, redirect to dashboard
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />
  }
  
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center py-16 px-4">
        <div className="w-full max-w-md">
          {/* Header - Centered */}
          <div className="mb-12 text-center">
            <Link to="/" className="text-2xl font-bold tracking-tight text-stone-900 mb-3 inline-block">
              ature studio.
            </Link>
            <p className="text-stone-600 text-sm">Create your account</p>
          </div>
          
          {/* Card - Perfectly centered with consistent padding */}
          <div className="bg-white rounded-2xl shadow-lg border border-stone-200 p-10">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              redirectUrl="/dashboard"
              afterSignUpUrl="/dashboard"
              appearance={{
                baseTheme: undefined,
                elements: {
                  rootBox: 'w-full m-0 p-0',
                  card: 'shadow-none border-0 bg-transparent p-0 m-0',
                  cardBox: 'shadow-none border-0 bg-transparent p-0 m-0 w-full',
                  headerTitle: 'text-stone-900 font-serif-ature text-2xl font-semibold mb-2 text-center p-0 m-0',
                  headerSubtitle: 'text-stone-500 text-sm mb-8 text-center p-0 m-0',
                  socialButtonsBlock: 'p-0 m-0 mb-8',
                  socialButtonsBlockButton: 'border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-900 transition-all rounded-full font-medium w-full mb-3 last:mb-0',
                  socialButtonsBlockButtonText: 'text-stone-900 font-medium text-sm',
                  dividerLine: 'bg-stone-200 my-8',
                  dividerText: 'text-stone-500 text-xs px-4 bg-white',
                  formField: 'p-0 m-0 mb-5',
                  formFieldLabel: 'text-stone-700 font-medium text-sm mb-2',
                  formFieldInput: 'border border-stone-200 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 h-12 px-4 text-sm w-full',
                  formButtonPrimary: 'bg-stone-900 hover:bg-stone-800 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all w-full mb-8 h-12 text-sm',
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
          
          {/* Footer link - Centered */}
          <p className="mt-10 text-center text-sm text-stone-500">
            Already have an account?{' '}
            <Link to="/sign-in" className="text-stone-900 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  )
}

