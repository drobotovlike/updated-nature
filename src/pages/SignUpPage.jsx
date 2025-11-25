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
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="text-2xl font-bold tracking-tight text-stone-900 mb-2 inline-block">
              ature studio.
            </Link>
            <p className="text-stone-600 text-sm">Create your account</p>
          </div>
          
          <div className="bg-white rounded-2xl border border-stone-200 shadow-lg p-8">
            <SignUp
              appearance={{
                baseTheme: undefined,
                elements: {
                  rootBox: 'mx-auto w-full',
                  card: 'shadow-none border-0 bg-transparent p-0',
                  headerTitle: 'text-stone-900 font-serif-ature text-3xl font-semibold mb-2',
                  headerSubtitle: 'text-stone-500 text-sm mb-6',
                  socialButtonsBlockButton: 'border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-900 transition-all rounded-lg font-medium shadow-sm hover:shadow',
                  socialButtonsBlockButtonText: 'text-stone-900 font-medium',
                  formButtonPrimary: 'bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all',
                  formButtonReset: 'text-stone-600 hover:text-stone-900',
                  footerActionLink: 'text-stone-900 hover:text-stone-700 font-semibold',
                  formFieldInput: 'border border-stone-200 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 rounded-lg bg-white text-stone-900 placeholder:text-stone-400',
                  formFieldLabel: 'text-stone-700 font-medium',
                  formFieldErrorText: 'text-red-600 text-sm',
                  dividerLine: 'bg-stone-200',
                  dividerText: 'text-stone-500 text-sm',
                  identityPreviewText: 'text-stone-900',
                  identityPreviewEditButton: 'text-stone-600 hover:text-stone-900',
                  formResendCodeLink: 'text-stone-900 hover:text-stone-700 font-semibold',
                  otpCodeFieldInput: 'border border-stone-200 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 rounded-lg',
                  alertText: 'text-stone-600',
                  formHeaderTitle: 'text-stone-900 font-serif-ature text-2xl font-semibold',
                  formHeaderSubtitle: 'text-stone-500 text-sm',
                },
                variables: {
                  colorPrimary: '#0c0a09',
                  colorText: '#0c0a09',
                  colorTextSecondary: '#78716c',
                  colorBackground: '#ffffff',
                  colorInputBackground: '#ffffff',
                  colorInputText: '#0c0a09',
                  borderRadius: '0.5rem',
                  fontFamily: "'Manrope', 'Helvetica', system-ui, sans-serif",
                  fontFamilyButtons: "'Manrope', 'Helvetica', system-ui, sans-serif",
                },
              }}
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              redirectUrl="/dashboard"
              afterSignUpUrl="/dashboard"
            />
          </div>
          
          <p className="mt-6 text-center text-sm text-stone-500">
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

