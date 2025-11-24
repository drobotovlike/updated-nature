import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser, useAuth, UserButton } from '@clerk/clerk-react'

// Prefetch page components on hover for faster navigation
const prefetchPage = (path) => {
  if (path === '/') return
  if (path === '/dashboard') import('./../pages/DashboardPage')
  if (path === '/pricing') import('./../pages/PricingPage')
  if (path === '/blog') import('./../pages/BlogPage')
  if (path === '/about') import('./../pages/AboutPage')
  if (path === '/help') import('./../pages/HelpPage')
  if (path === '/account') import('./../pages/AccountPage')
  if (path === '/sign-in') import('./../pages/SignInPage')
  if (path === '/sign-up') import('./../pages/SignUpPage')
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Studio' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/blog', label: 'Blog' },
    { path: '/about', label: 'About' },
    { path: '/help', label: 'Help' },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-6 md:px-10 bg-stone-50/80 backdrop-blur-xl safe-area-top">
        {/* Left: Menu Trigger */}
        <button 
          className="group p-2 -ml-2 hover:bg-stone-200/50 rounded-full transition-colors md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <div className="space-y-1.5">
            <span className={`block w-6 h-0.5 bg-stone-900 transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : 'group-hover:translate-x-1'}`}></span>
            <span className={`block w-4 h-0.5 bg-stone-900 transition-transform ${mobileMenuOpen ? 'opacity-0' : 'group-hover:translate-x-1'}`}></span>
            {!mobileMenuOpen && <span className="block w-6 h-0.5 bg-stone-900 transition-transform group-hover:translate-x-1"></span>}
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onMouseEnter={() => prefetchPage(link.path)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === link.path
                  ? 'text-stone-900 bg-stone-100'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Center: Brand */}
        <Link to="/" className="text-xl font-bold tracking-tight text-stone-900 absolute left-1/2 -translate-x-1/2">
          ature studio.
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button className="hidden md:flex p-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-600 hover:text-stone-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
          <button className="p-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-600 hover:text-stone-900 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full border border-stone-50"></span>
          </button>
          {isSignedIn ? (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/account"
                onMouseEnter={() => prefetchPage('/account')}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Account
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                    userButtonPopoverCard: 'shadow-xl border border-stone-200',
                    userButtonPopoverActionButton: 'hover:bg-stone-50',
                  },
                }}
              />
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/sign-in"
                onMouseEnter={() => prefetchPage('/sign-in')}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                onMouseEnter={() => prefetchPage('/sign-up')}
                className="px-4 py-2 text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 rounded-lg transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-[73px] left-0 right-0 z-40 bg-stone-50/95 backdrop-blur-xl border-b border-stone-200/50 md:hidden safe-area-top">
          <div className="flex flex-col px-6 py-4 gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onMouseEnter={() => prefetchPage(link.path)}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === link.path
                    ? 'text-stone-900 bg-stone-100'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isSignedIn ? (
              <>
                <Link
                  to="/account"
                  onMouseEnter={() => prefetchPage('/account')}
                  className="px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
                <div className="px-4 py-3">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: 'w-8 h-8',
                        userButtonPopoverCard: 'shadow-xl border border-stone-200',
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  onMouseEnter={() => prefetchPage('/sign-in')}
                  className="px-4 py-3 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/sign-up"
                  onMouseEnter={() => prefetchPage('/sign-up')}
                  className="px-4 py-3 text-sm font-medium bg-stone-900 text-white hover:bg-stone-800 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

