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
          
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-2">
            <SignUp
              appearance={{
                elements: {
                  rootBox: 'mx-auto',
                  card: 'shadow-none border-0 bg-transparent',
                  headerTitle: 'text-stone-900 font-serif-ature text-2xl',
                  headerSubtitle: 'text-stone-600',
                  socialButtonsBlockButton: 'border-stone-200 hover:bg-stone-50 text-stone-900 transition-all',
                  formButtonPrimary: 'bg-stone-900 hover:bg-stone-800 text-white',
                  footerActionLink: 'text-stone-900 hover:text-stone-700',
                  formFieldInput: 'border-stone-200 focus:border-stone-900',
                  formFieldLabel: 'text-stone-700',
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

