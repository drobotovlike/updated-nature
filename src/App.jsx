import { useEffect, useState, Suspense, lazy } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { saveProject, getProjects, addFileToProject, getSpaces } from './utils/projectManager'

// Lazy load pages for code splitting and faster initial load
const PricingPage = lazy(() => import('./pages/PricingPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

// Wrapper components for lazy-loaded pages with Layout
function PricingPageWrapper() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <PricingPage />
      </Suspense>
    </Layout>
  )
}

function BlogPageWrapper() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <BlogPage />
      </Suspense>
    </Layout>
  )
}

function AboutPageWrapper() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <AboutPage />
      </Suspense>
    </Layout>
  )
}

function HelpPageWrapper() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <HelpPage />
      </Suspense>
    </Layout>
  )
}

function SignInPageWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignInPage />
    </Suspense>
  )
}

function SignUpPageWrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SignUpPage />
    </Suspense>
  )
}

function AccountPageWrapper() {
  return (
    <Layout>
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <AccountPage />
        </Suspense>
      </ProtectedRoute>
    </Layout>
  )
}

function DashboardPageWrapper() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <DashboardPage />
      </Suspense>
    </ProtectedRoute>
  )
}

// Loading component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sm text-stone-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}

function useRevealOnScroll() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-element')
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function HomePage() {
  const navigate = useNavigate()
  useRevealOnScroll()

  return (
    <Layout>
      <div>
        {/* Hero Section */}
        <section className="mb-12 md:mb-20 relative">
          <div className="reveal-element text-center max-w-4xl mx-auto mb-10">
            <h1 className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] font-semibold tracking-tighter text-stone-950 mb-6">
              Visualize interiors <br />
              <span className="text-stone-400 font-light italic font-serif-ature">with</span> native intelligence.
            </h1>
            <p className="text-lg text-stone-500 max-w-xl mx-auto leading-relaxed mb-8">
              Transform empty spaces into fully furnished sanctuaries in seconds. The AI copilot for professional interior designers and architects.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full md:w-auto px-8 py-4 bg-stone-900 text-white rounded-full font-semibold text-sm tracking-wide hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 hover:translate-y-[-2px]"
              >
                Start Designing Free
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full md:w-auto px-8 py-4 bg-white text-stone-900 border border-stone-200 rounded-full font-semibold text-sm tracking-wide hover:border-stone-400 transition-all flex items-center justify-center gap-2 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10 8 16 12 10 16" />
                </svg>
                Watch Demo
              </button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="reveal-element delay-200 relative w-full aspect-[4/3] md:aspect-[21/9] bg-stone-200 rounded-[2rem] md:rounded-[3rem] overflow-hidden group shadow-2xl shadow-stone-200">
            <img 
              src="https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=2600&auto=format&fit=crop" 
              alt="AI Designed Interior" 
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
            />
            
            {/* Hotspot 1 */}
            <div className="absolute top-[55%] left-[20%] md:left-[25%] group/spot pointer-events-auto">
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/spot:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/spot:translate-y-0 min-w-max">
                <div className="bg-white/90 backdrop-blur-md text-stone-900 px-4 py-2 rounded-xl shadow-xl border border-white/50 flex items-center gap-3">
                  <div className="w-8 h-8 bg-stone-100 rounded-lg overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=100&q=80" loading="lazy" className="w-full h-full object-cover" alt="Chair" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Generated</p>
                    <p className="text-xs font-semibold">Kasaya Chair Blend</p>
                  </div>
                </div>
              </div>
              <div className="relative w-4 h-4 md:w-6 md:h-6 bg-white rounded-full shadow-lg cursor-pointer hotspot-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-stone-900 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-10 border-b border-stone-100 mb-20 overflow-hidden">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-stone-400 mb-8">Trusted by leading design firms</p>
          <div className="relative w-full max-w-5xl mx-auto">
            <div className="flex gap-16 md:gap-24 justify-center items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="text-xl font-bold tracking-tighter font-serif-ature">ARCHITECTURAL</span>
              <span className="text-xl font-bold tracking-tight">dwell</span>
              <span className="text-xl font-serif-ature italic">Vogue Living</span>
              <span className="text-xl font-bold tracking-tighter">DEZEEN</span>
              <span className="text-xl font-bold font-mono">HOUZZ</span>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="features" className="mb-32 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-element">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-stone-900 mb-4">Design smarter, not harder.</h2>
            <p className="text-stone-500 text-lg">Eliminate the guesswork from interior staging. Ature gives you the tools to visualize outcomes before lifting a finger.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="p-8 rounded-[2rem] bg-white border border-stone-200 hover:shadow-lg transition-shadow reveal-element delay-100">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Rendering</h3>
              <p className="text-stone-500 leading-relaxed">Skip the 48-hour rendering queue. Generate photorealistic interior previews in under 30 seconds with our GPU clusters.</p>
            </div>

            {/* Benefit 2 */}
            <div className="p-8 rounded-[2rem] bg-white border border-stone-200 hover:shadow-lg transition-shadow reveal-element delay-200">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900">
                  <path d="M21.16 6.26a1 1 0 0 0-1.41-1.41l-2.4 2.4a2 2 0 0 1-2.24 2.24l-2.4 2.4a1 1 0 0 0 0 1.41l.7.7a1 1 0 0 0 1.41 0l2.4-2.4a2 2 0 0 1 2.24-2.24l2.4-2.4.7.7Z" />
                  <path d="M11 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
                  <path d="m11 5 8 8" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Intelligent Scale</h3>
              <p className="text-stone-500 leading-relaxed">Furniture that actually fits. Our AI analyzes room dimensions to suggest pieces that work within physical constraints.</p>
            </div>

            {/* Benefit 3 */}
            <div className="p-8 rounded-[2rem] bg-white border border-stone-200 hover:shadow-lg transition-shadow reveal-element delay-300">
              <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900">
                  <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
                  <path d="M22 17.65v-4.26l-9 4.1" />
                  <path d="M2 17.65v-4.26l9 4.1" />
                  <path d="M22 17.65v-4.26l-9 4.1" />
                  <path d="M2 17.65v-4.26l9 4.1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Style Consistency</h3>
              <p className="text-stone-500 leading-relaxed">Upload a moodboard and let Ature apply the texture, lighting, and vibe to your empty space automatically.</p>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section id="how-it-works" className="mb-32 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 px-2 reveal-element">
            <div>
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 block">Workflow</span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-stone-900">From scan to sanctuary.</h2>
            </div>
            <div className="hidden md:block pb-2">
              <Link to="/help" className="text-sm font-semibold border-b border-stone-900 pb-0.5 hover:text-stone-600 hover:border-stone-600 transition-colors">View full tutorial</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step 1: Design Mode */}
            <div className="lg:col-span-7 bg-white rounded-[2.5rem] p-8 md:p-10 border border-stone-200 shadow-sm group reveal-element">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold">1</span>
                <h3 className="text-xl font-semibold">Describe your vision</h3>
              </div>
              
              {/* UI Mockup */}
              <div className="relative bg-stone-50 rounded-2xl border border-stone-100 p-5 h-64 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="absolute top-0 right-0 w-56 h-56 bg-purple-100/50 -mr-10 -mt-10 rounded-full blur-3xl"></div>

                <div className="relative z-10 space-y-3">
                  <div className="w-full bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 mt-1 flex-shrink-0">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-stone-600 font-medium">&quot;Minimalist Japanese living room, low teak furniture, paper lamps, warm ambient lighting...&quot;</p>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-3">
                  <div className="px-3 py-2 bg-white border border-stone-200 rounded-lg flex items-center gap-2 text-stone-500 text-xs font-semibold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    room_scan.jpg
                  </div>
                  <div className="flex-1 h-px bg-stone-200"></div>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold tracking-wide hover:bg-stone-800 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2: Explore Mode */}
            <div className="lg:col-span-5 bg-stone-900 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden group reveal-element delay-100">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-8 h-8 rounded-full bg-white text-stone-900 flex items-center justify-center text-sm font-bold">2</span>
                  <h3 className="text-xl font-semibold">Experience in AR</h3>
                </div>
                <p className="text-stone-400 mb-8">Export your generated designs directly to .USDZ or .GLB formats for instant AR walkthroughs on iOS and Android.</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">.GLB</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <rect x="5" y="2" width="14" height="20" rx="2" />
                      <path d="M12 18h.01" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">.USDZ</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-gradient-to-br from-green-500 to-blue-500 rounded-full opacity-20 blur-3xl"></div>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="mb-32 max-w-5xl mx-auto reveal-element">
          <div className="relative bg-stone-100 rounded-[3rem] p-8 md:p-16 overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-10 left-10 w-12 h-12 text-stone-300 rotate-180">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
            
            <div className="relative z-10 text-center">
              <h3 className="text-2xl md:text-4xl font-serif-ature font-light italic text-stone-900 leading-tight mb-8">
                &quot;Ature has completely revolutionized our client presentations. We&apos;ve cut our staging time by 70% while increasing client approval rates on the first pitch.&quot;
              </h3>
              
              <div className="flex flex-col items-center justify-center gap-3">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" loading="lazy" alt="User" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" />
                <div className="text-center">
                  <p className="text-sm font-bold text-stone-900">Elena Rodriguez</p>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Lead Architect at Studio Kōan</p>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-center gap-8 border-t border-stone-200 pt-8 w-full max-w-sm mx-auto">
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-900">70%</p>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Faster Staging</p>
                </div>
                <div className="w-px h-8 bg-stone-200"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-900">2x</p>
                  <p className="text-[10px] text-stone-500 uppercase font-bold">Win Rate</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="mb-32 max-w-3xl mx-auto px-4 reveal-element">
          <h2 className="text-3xl font-semibold text-center mb-12 tracking-tight">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {/* Q1 */}
            <details className="group border border-stone-200 rounded-2xl bg-white open:shadow-md transition-all">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6">
                <span>Can I export models to Revit or SketchUp?</span>
                <span className="transition group-open:rotate-180">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <div className="text-stone-600 px-6 pb-6 leading-relaxed text-sm">
                Yes! We support exports to .OBJ and .FBX formats which are compatible with most professional CAD software including Revit, SketchUp, and Rhino.
              </div>
            </details>

            {/* Q2 */}
            <details className="group border border-stone-200 rounded-2xl bg-white open:shadow-md transition-all">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6">
                <span>Is the generated furniture commercially available?</span>
                <span className="transition group-open:rotate-180">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <div className="text-stone-600 px-6 pb-6 leading-relaxed text-sm">
                Our &quot;Market Mode&quot; matches generated items with real inventory from over 400 partner brands. You can generate a shopping list with one click.
              </div>
            </details>

            {/* Q3 */}
            <details className="group border border-stone-200 rounded-2xl bg-white open:shadow-md transition-all">
              <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-6">
                <span>How does the pricing work?</span>
                <span className="transition group-open:rotate-180">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <div className="text-stone-600 px-6 pb-6 leading-relaxed text-sm">
                We offer a free tier for hobbyists. Professional plans start at $29/month allowing for high-resolution exports and commercial licensing.
              </div>
            </details>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mb-20 reveal-element">
          <div className="bg-stone-900 rounded-[3rem] py-20 px-6 text-center text-white relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tighter mb-6">Ready to transform your workflow?</h2>
              <p className="text-stone-400 text-lg mb-10">Join 10,000+ designers using Ature to visualize the future of living spaces.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto px-8 py-4 bg-white text-stone-900 rounded-full font-bold hover:bg-stone-100 transition-colors"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full sm:w-auto px-8 py-4 bg-stone-800 border border-stone-700 text-white rounded-full font-bold hover:bg-stone-700 transition-colors"
                >
                  Book a Demo
                </button>
              </div>
              <p className="mt-6 text-xs text-stone-500">No credit card required for free tier.</p>
            </div>
            
            {/* Decorative Blurs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
            </div>
          </div>
        </section>

      </div>
    </Layout>
  )
}

function StudioPage() {
  useRevealOnScroll()
  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()

  // Lazy load model-viewer only when Studio page loads
  useEffect(() => {
    import('@google/model-viewer').catch(console.error)
  }, [])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [dragDepth, setDragDepth] = useState(0) // used to smooth drag enter/leave transitions
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [furnitureFile, setFurnitureFile] = useState(null)
  const [_model3dFile, setModel3dFile] = useState(null)
  const [model3dUrl, setModel3dUrl] = useState('')
  const [is3dModel, setIs3dModel] = useState(false)
  const [roomFileName, setRoomFileName] = useState('')
  const [roomPreviewUrl, setRoomPreviewUrl] = useState('')
  const [roomFile, setRoomFile] = useState(null)
  const [resultUrl, setResultUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('') // 'picture' | 'ar'
  const [description, setDescription] = useState('')
  const [useAIDesigner, setUseAIDesigner] = useState(false)
  
  // Project management state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [selectedSpaceId, setSelectedSpaceId] = useState(null)
  const [spaces, setSpaces] = useState([])
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [savedProjects, setSavedProjects] = useState([])
  const [furnitureBase64, setFurnitureBase64] = useState(null)
  const [roomBase64, setRoomBase64] = useState(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (roomPreviewUrl) {
        URL.revokeObjectURL(roomPreviewUrl)
      }
      if (model3dUrl) {
        URL.revokeObjectURL(model3dUrl)
      }
    }
  }, [previewUrl, roomPreviewUrl, model3dUrl])

  const handleDragEnter = (event) => {
    event.preventDefault()
    setDragDepth((depth) => depth + 1)
    setDragActive(true)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setDragDepth((depth) => {
      const next = Math.max(0, depth - 1)
      if (next === 0) {
        setDragActive(false)
      }
      return next
    })
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragDepth(0)
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      setFileName(file.name)
      const is3d = is3dModelFile(file.name)
      setIs3dModel(is3d)
      
      if (is3d) {
        setModel3dFile(file)
        if (model3dUrl) {
          URL.revokeObjectURL(model3dUrl)
        }
        setModel3dUrl(URL.createObjectURL(file))
        setFurnitureFile(null)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl('')
        }
      } else {
        setFurnitureFile(file)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(URL.createObjectURL(file))
        setModel3dFile(null)
        if (model3dUrl) {
          URL.revokeObjectURL(model3dUrl)
          setModel3dUrl('')
        }
      }
    }
  }

  const is3dModelFile = (filename) => {
    const ext = filename.toLowerCase().split('.').pop()
    return ['glb', 'gltf', 'usdz', 'obj', 'fbx'].includes(ext)
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setFileName(file.name)
      const is3d = is3dModelFile(file.name)
      setIs3dModel(is3d)
      
      if (is3d) {
        setModel3dFile(file)
        if (model3dUrl) {
          URL.revokeObjectURL(model3dUrl)
        }
        setModel3dUrl(URL.createObjectURL(file))
        setFurnitureFile(null)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
          setPreviewUrl('')
        }
      } else {
        setFurnitureFile(file)
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(URL.createObjectURL(file))
        setModel3dFile(null)
        if (model3dUrl) {
          URL.revokeObjectURL(model3dUrl)
          setModel3dUrl('')
        }
      }
    }
  }

  const handleRoomFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (file) {
      setRoomFileName(file.name)
      setRoomFile(file)
      if (roomPreviewUrl) {
        URL.revokeObjectURL(roomPreviewUrl)
      }
      setRoomPreviewUrl(URL.createObjectURL(file))
      // Store base64 for project saving
      try {
        const base64 = await fileToBase64(file)
        setRoomBase64(base64)
      } catch (err) {
        console.error('Error converting room file to base64:', err)
      }
    }
  }

  const triggerRoomFileInput = () => {
    const input = document.getElementById('ature-room-upload-input')
    input?.click()
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  // Load saved projects
  useEffect(() => {
    if (userId) {
      const projects = getProjects(userId)
      setSavedProjects(projects)
    }
  }, [userId])

  // Save project handler
  const handleSaveProject = async () => {
    if (!isSignedIn || !userId) {
      setError('Please sign in to save projects')
      setShowSaveModal(true)
      return
    }

    if (!projectName.trim()) {
      setError('Please enter a project name')
      return
    }

    try {
      // Convert files to base64 if needed
      let furnitureBase64Data = furnitureBase64
      let roomBase64Data = roomBase64

      if (furnitureFile && !furnitureBase64Data) {
        furnitureBase64Data = await fileToBase64(furnitureFile)
        setFurnitureBase64(furnitureBase64Data)
      }

      if (roomFile && !roomBase64Data) {
        roomBase64Data = await fileToBase64(roomFile)
        setRoomBase64(roomBase64Data)
      }

      const workflowData = {
        mode,
        furnitureFile,
        furnitureFileName: fileName,
        furniturePreviewUrl: previewUrl,
        furnitureBase64: furnitureBase64Data,
        roomFile,
        roomFileName,
        roomPreviewUrl,
        roomBase64: roomBase64Data,
        model3dUrl,
        resultUrl,
        description,
        useAIDesigner,
      }

      const project = saveProject(userId, projectName.trim(), workflowData, selectedSpaceId || null)
      
      // If there's a result, add it to project files
      if (resultUrl) {
        await addFileToProject(userId, project.id, {
          name: `Generated Result - ${projectName}`,
          url: resultUrl,
          type: 'image',
        })
      }

      // Refresh projects list
      setSavedProjects(getProjects(userId))
      setShowSaveModal(false)
      setProjectName('')
      setSelectedSpaceId(null)
      setError('')
      
      // Show success message
      alert(`Project "${project.name}" saved successfully!`)
    } catch (err) {
      setError(err.message || 'Failed to save project')
      console.error('Error saving project:', err)
    }
  }

  // Load project handler
  const handleLoadProject = (project) => {
    if (project.workflow) {
      if (project.workflow.mode) setMode(project.workflow.mode)
      if (project.workflow.furnitureFile) {
        setFileName(project.workflow.furnitureFile.name)
        setPreviewUrl(project.workflow.furnitureFile.url)
        setFurnitureBase64(project.workflow.furnitureFile.base64)
      }
      if (project.workflow.roomFile) {
        setRoomFileName(project.workflow.roomFile.name)
        setRoomPreviewUrl(project.workflow.roomFile.url)
        setRoomBase64(project.workflow.roomFile.base64)
      }
      if (project.workflow.model3d) {
        setModel3dUrl(project.workflow.model3d.url)
        setIs3dModel(true)
      }
      if (project.workflow.result) {
        setResultUrl(project.workflow.result.url)
        setDescription(project.workflow.result.description || '')
        setUseAIDesigner(project.workflow.result.useAIDesigner || false)
      }
    }
    setShowProjectsModal(false)
  }

  const handleSeeResult = async () => {
    if (!furnitureFile || !roomFile) return
    setIsProcessing(true)
    setError('')
    setResultUrl('')
    try {
      // Convert files to base64
      const furnitureBase64Data = await fileToBase64(furnitureFile)
      const roomBase64Data = await fileToBase64(roomFile)
      
      // Store base64 for project saving
      setFurnitureBase64(furnitureBase64Data)
      setRoomBase64(roomBase64Data)

      const response = await fetch('/api/nano-banana/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          furnitureBase64: furnitureBase64Data,
          roomBase64: roomBase64Data,
          description: useAIDesigner ? '' : description,
          useAIDesigner,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate visualization' }))
        throw new Error(errorData.error || 'Failed to generate visualization')
      }

      const data = await response.json()
      console.log('API Response:', data)
      
      if (data.imageUrl) {
        console.log('Setting result URL, length:', data.imageUrl.length)
        setResultUrl(data.imageUrl)
      } else if (data.text) {
        // If Gemini returns text, show it as a message
        console.log('Got text response:', data.text)
        setError(`AI Response: ${data.text}`)
      } else {
        console.error('Unexpected response format:', data)
        throw new Error('Unexpected response format: ' + JSON.stringify(data))
      }
    } catch (e) {
      setError(e.message || 'Something went wrong while generating the result.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!resultUrl) return
    const link = document.createElement('a')
    link.href = resultUrl
    link.download = `ature-blended-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const triggerFileInput = () => {
    const input = document.getElementById('ature-upload-input')
    input?.click()
  }

  return (
    <div className="bg-stone-50 min-h-screen text-stone-900 antialiased overflow-x-hidden flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-6 md:px-10 bg-stone-50/80 backdrop-blur-xl border-b border-stone-200/50 safe-area-top">
        {/* Left: Navigation buttons */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            ← Back
          </Link>
          <button
            onClick={() => {
              if (!isSignedIn) {
                setError('Please sign in to save projects')
                return
              }
              setShowSaveModal(true)
            }}
            className="px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-900 hover:bg-stone-50 hover:border-stone-300 transition-all text-sm font-medium"
          >
            Save Project
          </button>
          <button
            onClick={() => {
              if (!isSignedIn) {
                setError('Please sign in to view projects')
                return
              }
              setSavedProjects(getProjects(userId))
              setShowProjectsModal(true)
            }}
            className="hidden md:flex px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            My Projects
          </button>
          <button
            className="group p-2 -ml-2 hover:bg-stone-200/50 rounded-full transition-colors md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1.5">
              <span className={`block w-6 h-0.5 bg-stone-900 transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : 'group-hover:translate-x-1'}`}></span>
              <span className={`block w-4 h-0.5 bg-stone-900 transition-transform ${mobileMenuOpen ? 'opacity-0' : 'group-hover:translate-x-1'}`}></span>
              {!mobileMenuOpen && <span className="block w-6 h-0.5 bg-stone-900 transition-transform group-hover:translate-x-1"></span>}
            </div>
          </button>
        </div>

        {/* Center: Brand */}
        <Link to="/" className="text-xl font-bold tracking-tight text-stone-900 absolute left-1/2 -translate-x-1/2">
          ature studio.
        </Link>

        {/* Right: Empty for now, can add user button later */}
        <div className="w-20"></div>
      </nav>

      {/* Mobile Menu for Studio */}
      {mobileMenuOpen && (
        <div className="fixed top-[73px] left-0 right-0 z-40 bg-stone-50/95 backdrop-blur-xl border-b border-stone-200/50 md:hidden safe-area-top">
          <div className="flex flex-col px-6 py-4 gap-2">
            <Link
              to="/"
              className="px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Studio
            </Link>
            <button
              className="px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors text-left"
              onClick={() => {
                setMobileMenuOpen(false)
                if (!isSignedIn) {
                  setError('Please sign in to save projects')
                  return
                }
                setShowSaveModal(true)
              }}
            >
              Save Project
            </button>
            <button
              className="px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors text-left"
              onClick={() => {
                setMobileMenuOpen(false)
                if (!isSignedIn) {
                  setError('Please sign in to view projects')
                  return
                }
                setSavedProjects(getProjects(userId))
                setShowProjectsModal(true)
              }}
            >
              My Projects
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pt-32 pb-20 px-4 md:px-6 max-w-[1800px] mx-auto safe-area-x">
        <section className="reveal-element mb-12 md:mb-16">
          <div className="flex items-center justify-between gap-6 mb-8">
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500 mb-2 font-semibold">Studio</p>
              <h1 className="text-3xl md:text-4xl font-serif-ature font-semibold text-stone-900">
                Blend your next <span className="italic text-stone-500 font-light">hero piece</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Real-time preview
              </span>
              <span className="px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200">
                Export: PNG • WEBP
              </span>
            </div>
          </div>
        </section>

        <section className="reveal-element grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
          {/* Left side: Upload Zone - Unified container with seamless transitions */}
          <div className="h-[600px] md:h-[700px] unified-panel">
            {!mode ? (
              // Initial mode selection - "Let's design" card
              <button
                type="button"
                onClick={() => setMode('picture')}
                className="bg-white border border-stone-200 rounded-2xl p-8 h-full w-full flex flex-col items-center justify-center text-center hover:border-stone-300 hover:shadow-xl window-transition group"
              >
                <div className="w-20 h-20 rounded-2xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <h3 className="font-serif-ature text-3xl text-stone-900 mb-3">Let&apos;s design</h3>
                <p className="text-sm text-stone-500">Blend furniture into room photos</p>
              </button>
            ) : (
              // Drag and drop window - Seamless transition
              <div
                data-drag-depth={dragDepth}
                className={`upload-zone-simple rounded-2xl h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer group relative overflow-hidden bg-white border border-stone-200 window-transition ${
                  dragActive ? 'border-stone-400 shadow-2xl scale-[1.01]' : 'hover:border-stone-300 hover:shadow-xl'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <div className="absolute inset-0 pointer-events-none opacity-30">
                  <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-gradient-to-br from-stone-100 to-transparent blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-gradient-to-tl from-stone-50 to-transparent blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col items-center gap-4 transition-all duration-300 group-hover:-translate-y-1">
                  <div className="w-16 h-16 rounded-2xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-xl mb-2">
                    <span className="text-sm tracking-[0.2em] uppercase font-semibold">AI</span>
                  </div>
                  <p className="text-sm font-medium text-stone-700 tracking-wide">
                    Drag &amp; drop or click to browse
                  </p>
                  <p className="text-xs text-stone-500">
                    {mode === 'ar' ? '3D models (GLB, GLTF, USDZ)' : 'Images (JPG, PNG, WEBP)'}
                  </p>
                  {fileName && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-900 text-stone-50 px-4 py-2 text-xs font-medium shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="truncate max-w-[200px]">{fileName}</span>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-6 left-6 right-6 flex justify-center items-center gap-3 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-stone-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Auto background
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-stone-200 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Lighting match
                  </span>
                </div>

                <input
                  id="ature-upload-input"
                  type="file"
                  accept={mode === 'ar' ? '.glb,.gltf,.usdz,.obj,.fbx' : 'image/jpeg,image/png,image/webp'}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Right side: Design Mode Panel - Unified container with seamless transitions */}
          <aside className="h-[600px] md:h-[700px] unified-panel">
            {!mode ? (
              // Show the second mode selection card initially
              <div className="bg-white border border-stone-200 rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center window-transition">
                <button
                  type="button"
                  onClick={() => setMode('ar')}
                  className="w-full h-full flex flex-col items-center justify-center group hover:border-stone-300 hover:shadow-xl window-transition"
                >
                  <div className="w-20 h-20 rounded-2xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>
                  <h3 className="font-serif-ature text-3xl text-stone-900 mb-3">Let&apos;s explore</h3>
                  <p className="text-sm text-stone-500">View 3D models in AR</p>
                </button>
              </div>
            ) : (
              // Design Mode Panel - Unified container that morphs seamlessly
              <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 h-full flex flex-col overflow-hidden window-transition shadow-sm">
                {/* Design Mode Header - Consistent across all states */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 flex-shrink-0">
                  <div>
                    <h2 className="font-serif-ature text-xl md:text-2xl text-stone-900 mb-1">
                      {mode === 'picture' ? 'Design Mode' : 'Explore Mode'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      {mode === 'picture' ? 'Blend furniture into your space' : 'View 3D models in AR'}
                    </p>
      </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('')
                      setFileName('')
                      setPreviewUrl('')
                      setModel3dUrl('')
                      setFurnitureFile(null)
                      setModel3dFile(null)
                      setRoomFile(null)
                      setRoomPreviewUrl('')
                      setResultUrl('')
                      setDescription('')
                      setUseAIDesigner(false)
                      if (previewUrl) URL.revokeObjectURL(previewUrl)
                      if (model3dUrl) URL.revokeObjectURL(model3dUrl)
                      if (roomPreviewUrl) URL.revokeObjectURL(roomPreviewUrl)
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-200"
                  >
                    Reset
        </button>
                </div>

                {/* Scrollable content area - Unified spacing */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
 
                  {/* Furniture Preview */}
                  {previewUrl && !is3dModel && (
                    <div className="bg-stone-50/50 border border-stone-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-stone-700 mb-3 uppercase tracking-wider">Furniture Preview</p>
                      <div className="aspect-video w-full overflow-hidden rounded-lg border border-stone-200 bg-white flex items-center justify-center shadow-inner">
                        <img src={previewUrl} alt={fileName} className="max-h-full max-w-full object-contain" />
                      </div>
                    </div>
                  )}
                  
                  {model3dUrl && is3dModel && (
                    <div className="bg-stone-50/50 border border-stone-200 rounded-xl p-4 shadow-sm">
                      <p className="text-xs font-semibold text-stone-700 mb-3 uppercase tracking-wider">3D Model Preview</p>
                      <div className="w-full h-[240px] rounded-lg border border-stone-200 bg-stone-900 overflow-hidden shadow-inner">
                        <model-viewer
                          src={model3dUrl}
                          alt="3D Model"
                          camera-controls
                          touch-action="pan-y"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                    </div>
                  )}

                  {mode === 'picture' && (
                    <>
                      {!previewUrl ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-stone-400"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-stone-600 mb-2">
                            Upload your furniture image to get started
                          </p>
                          <p className="text-xs text-stone-400">
                            Then add a room photo to blend them together
        </p>
      </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Room Upload Section */}
                          <div>
                            <p className="text-xs font-semibold text-stone-700 mb-3 uppercase tracking-wider">Room Environment</p>
                            <button
                              type="button"
                              onClick={triggerRoomFileInput}
                              className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg border-2 border-dashed border-stone-300 bg-stone-50/50 text-left hover:border-stone-400 hover:bg-stone-100 hover:shadow-sm transition-all group"
                            >
                              <span className="text-sm text-stone-700 font-medium">
                                {roomFileName || 'Upload room / environment photo'}
                              </span>
                              <span className="text-xs uppercase tracking-wider text-stone-500 group-hover:text-stone-700 font-semibold">Browse</span>
                            </button>
                            <input
                              id="ature-room-upload-input"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={handleRoomFileChange}
                            />
                          </div>

                          {/* Room Preview */}
                          {roomPreviewUrl && (
                            <div className="bg-stone-50/50 border border-stone-200 rounded-xl p-4 shadow-sm">
                              <p className="text-xs font-semibold text-stone-700 mb-3 uppercase tracking-wider">Room Preview</p>
                              <div className="aspect-video w-full overflow-hidden rounded-lg border border-stone-200 bg-white flex items-center justify-center shadow-inner">
                                <img src={roomPreviewUrl} alt={roomFileName} className="max-h-full max-w-full object-contain" />
                              </div>
                            </div>
                          )}

                          {/* Description or AI Designer Choice */}
                          {roomPreviewUrl && (
                            <div className="space-y-4">
                              <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Placement Options</p>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUseAIDesigner(true)
                                    setDescription('')
                                  }}
                                  className={`flex-1 px-4 py-3.5 rounded-lg text-sm font-semibold transition-all ${
                                    useAIDesigner
                                      ? 'bg-stone-900 text-stone-50 shadow-lg'
                                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                                  }`}
                                >
                                  ✨ AI Designer Choice
                                </button>
                                <span className="text-xs text-stone-400 font-medium">or</span>
                                <button
                                  type="button"
                                  onClick={() => setUseAIDesigner(false)}
                                  className={`flex-1 px-4 py-3.5 rounded-lg text-sm font-semibold transition-all ${
                                    !useAIDesigner
                                      ? 'bg-stone-900 text-stone-50 shadow-lg'
                                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                                  }`}
                                >
                                  ✏️ Custom
                                </button>
                              </div>
                              
                              {!useAIDesigner && (
                                <textarea
                                  value={description}
                                  onChange={(e) => setDescription(e.target.value)}
                                  placeholder="Describe where you want to place the furniture (e.g., 'Place the chair in the corner near the window with natural lighting')"
                                  className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white text-sm text-stone-700 placeholder-stone-400 resize-none focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-400/20 transition-all"
                                  rows="3"
                                />
                              )}
                              
                              {useAIDesigner && (
                                <p className="text-xs text-stone-500 italic bg-stone-50/80 px-4 py-3 rounded-lg border border-stone-200">
                                  AI will choose the best placement with optimal lighting and perspective
                                </p>
                              )}
                            </div>
                          )}

                          {/* Generate Button */}
                          {roomPreviewUrl && (
                            <button
                              type="button"
                              onClick={handleSeeResult}
                              disabled={!previewUrl || !roomPreviewUrl || isProcessing || (!useAIDesigner && !description.trim())}
                              className={`w-full px-6 py-4 rounded-lg text-sm font-bold tracking-wider uppercase transition-all ${
                                !previewUrl || !roomPreviewUrl || isProcessing || (!useAIDesigner && !description.trim())
                                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-lg hover:shadow-xl hover:scale-[1.02]'
                              }`}
                            >
                              {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Generating…
                                </span>
                              ) : (
                                'See the result'
                              )}
                            </button>
                          )}
                          {error && (
                            <div className="bg-red-50/80 border border-red-200 rounded-lg px-4 py-3 shadow-sm">
                              <p className="text-xs text-red-600 font-medium">{error}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {mode === 'ar' && (
                    <div className="flex-1 flex flex-col justify-center text-center py-12">
                      {!model3dUrl ? (
                        <>
                          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4 mx-auto">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-stone-400"
                            >
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-stone-600 mb-2">
                            Upload a 3D model to view it in augmented reality
                          </p>
                          <p className="text-xs text-stone-400">
                            Use your device camera to place it in your space
      </p>
    </>
                      ) : (
                        <div className="space-y-5">
                          <div className="bg-stone-900 rounded-xl p-4 shadow-lg">
                            <div className="w-full h-[300px] md:h-[350px] rounded-lg overflow-hidden border border-stone-800">
                              <model-viewer
                                src={model3dUrl}
                                alt="3D Model"
                                ar
                                ar-modes="webxr scene-viewer quick-look"
                                camera-controls
                                touch-action="pan-y"
                                style={{ width: '100%', height: '100%' }}
                              >
                                <button
                                  slot="ar-button"
                                  className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-white text-stone-900 text-sm font-bold tracking-wide hover:bg-stone-100 transition-colors shadow-xl hover:scale-105"
                                >
                                  View in AR
                                </button>
                              </model-viewer>
                            </div>
                          </div>
                          <p className="text-xs text-stone-500 font-medium">
                            Tap &quot;View in AR&quot; to place this model in your space
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Result Display */}
                  {resultUrl && (
                    <div className="bg-stone-50/50 border border-stone-200 rounded-xl p-5 space-y-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Generated Result</p>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="px-4 py-2 rounded-lg bg-stone-900 text-stone-50 text-xs font-bold tracking-wide hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-lg hover:scale-105"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download
                        </button>
                      </div>
                      <div className="aspect-video w-full overflow-hidden rounded-lg border border-stone-200 bg-white flex items-center justify-center shadow-inner">
                        <img src={resultUrl} alt="Visualization result" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setResultUrl('')
                            setDescription('')
                            setUseAIDesigner(false)
                          }}
                          className="flex-1 px-4 py-3 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
                        >
                          Edit Again
                        </button>
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="flex-1 px-4 py-3 rounded-lg bg-stone-900 text-stone-50 text-sm font-semibold hover:bg-stone-800 transition-colors shadow-lg hover:scale-[1.02]"
                        >
                          Save Result
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold text-stone-900 mb-4">Save Project</h2>
            {!isSignedIn && (
              <p className="text-sm text-stone-600 mb-4">
                Please <Link to="/sign-in" className="text-stone-900 font-semibold hover:underline">sign in</Link> to save projects.
              </p>
            )}
            {isSignedIn && (
              <>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name..."
                  className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 transition-all mb-4"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveProject()
                    }
                  }}
                />
                {spaces.length > 0 && (
                  <select
                    value={selectedSpaceId || ''}
                    onChange={(e) => setSelectedSpaceId(e.target.value || null)}
                    className="w-full px-4 py-3 rounded-lg border border-stone-200 bg-white text-stone-900 focus:outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/20 transition-all mb-4"
                  >
                    <option value="">No space (All Projects)</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                )}
                {error && (
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSaveModal(false)
                      setProjectName('')
                      setError('')
                    }}
                    className="flex-1 px-4 py-3 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProject}
                    className="flex-1 px-4 py-3 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Projects Modal */}
      {showProjectsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowProjectsModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-stone-900">My Projects</h2>
              <button
                onClick={() => setShowProjectsModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-600">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {savedProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-600 mb-4">No projects saved yet.</p>
                <p className="text-sm text-stone-500">Create and save your first project to see it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border border-stone-200 rounded-xl p-6 hover:border-stone-300 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-stone-900 mb-1">{project.name}</h3>
                        <p className="text-xs text-stone-500">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {project.workflow.furnitureFile && (
                        <div className="text-xs text-stone-600">
                          <span className="font-medium">Furniture:</span> {project.workflow.furnitureFile.name}
                        </div>
                      )}
                      {project.workflow.roomFile && (
                        <div className="text-xs text-stone-600">
                          <span className="font-medium">Room:</span> {project.workflow.roomFile.name}
                        </div>
                      )}
                      {project.workflow.result && (
                        <div className="text-xs text-stone-600">
                          <span className="font-medium">Generated:</span> Yes
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadProject(project)}
                        className="flex-1 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
                      >
                        Load
                      </button>
                      {project.workflow.result && (
                        <a
                          href={project.workflow.result.url}
                          download
                          className="px-4 py-2 rounded-lg border border-stone-200 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 transition-colors"
                        >
                          Download
                        </a>
                      )}
                    </div>

                    {/* Show project files if any */}
                    {project.workflow.files && project.workflow.files.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-stone-200">
                        <p className="text-xs font-medium text-stone-700 mb-2">Generated Files:</p>
                        <div className="space-y-1">
                          {project.workflow.files.map((file) => (
                            <a
                              key={file.id}
                              href={file.url}
                              download
                              className="block text-xs text-stone-600 hover:text-stone-900 hover:underline"
                            >
                              {file.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<DashboardPageWrapper />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/pricing" element={<PricingPageWrapper />} />
      <Route path="/blog" element={<BlogPageWrapper />} />
      <Route path="/about" element={<AboutPageWrapper />} />
      <Route path="/help" element={<HelpPageWrapper />} />
      <Route path="/sign-in" element={<SignInPageWrapper />} />
      <Route path="/sign-up" element={<SignUpPageWrapper />} />
      <Route path="/account" element={<AccountPageWrapper />} />
    </Routes>
  )
}

export default App
