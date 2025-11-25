import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { getProjects, deleteProject } from '../utils/projectManager'

export default function AccountView() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user, isLoaded } = useUser()
  const { userId } = useAuth()
  const [savedProjects, setSavedProjects] = useState([])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userName = user.fullName || user.firstName || 'User'
  const userEmail = user.primaryEmailAddress?.emailAddress || ''
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
  const userPlan = 'Free'

  useEffect(() => {
    async function loadProjects() {
      if (userId && activeTab === 'projects') {
        const projects = await getProjects(userId)
        setSavedProjects(projects)
      }
    }
    loadProjects()
  }, [userId, activeTab])

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'projects', label: 'Projects' },
  ]

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject(userId, projectId)
        const projects = await getProjects(userId)
        setSavedProjects(projects)
      } catch (error) {
        console.error('Error deleting project:', error)
        alert('Failed to delete project')
      }
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-serif-ature font-semibold tracking-tight text-stone-900 mb-2">
          Account Settings
        </h1>
        <p className="text-stone-600">Manage your account, billing, and project history.</p>
      </div>

      {/* User Info Card */}
      <div className="mb-8 bg-white rounded-2xl border border-stone-200 p-8">
        <div className="flex items-center gap-6 mb-6">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={userName}
              className="w-20 h-20 rounded-full object-cover border-2 border-stone-200"
            />
          ) : (
            <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">{userName}</h2>
            <p className="text-stone-600">{userEmail}</p>
            <span className="inline-block mt-2 px-3 py-1 bg-stone-900 text-white text-xs font-semibold rounded-full">
              {userPlan} Plan
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex gap-2 border-b border-stone-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-stone-900 text-stone-900'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8">
            <h3 className="text-xl font-semibold text-stone-900 mb-6">Profile Information</h3>
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue={userName}
                  disabled
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-900 transition-colors disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-stone-500">Update your name in Clerk dashboard</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Email Address</label>
                <input
                  type="email"
                  defaultValue={userEmail}
                  disabled
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-stone-900 transition-colors disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-stone-500">Update your email in Clerk dashboard</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Member Since</label>
                <p className="text-stone-600">{joinedDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
                >
                  Manage Account in Clerk
                </a>
                <p className="text-xs text-stone-500">Use Clerk dashboard to update profile details</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-8">
            {/* Current Subscription */}
            <div className="bg-white rounded-2xl border border-stone-200 p-8">
              <h3 className="text-xl font-semibold text-stone-900 mb-6">Current Subscription</h3>
              <div className="space-y-6 max-w-2xl">
                <div className="flex justify-between items-center p-6 bg-stone-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-stone-900 text-lg">{userPlan} Plan</p>
                    <p className="text-sm text-stone-600 mt-1">
                      {userPlan === 'Free' 
                        ? 'Perfect for trying out ATURE Studio' 
                        : userPlan === 'Pro'
                        ? '$29/month • Next billing date: April 15, 2024'
                        : 'Custom pricing • Contact your account manager'}
                    </p>
                  </div>
                  {userPlan !== 'Enterprise' && (
                    <button className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm font-semibold hover:bg-stone-50 transition-colors">
                      {userPlan === 'Free' ? 'Upgrade Plan' : 'Change Plan'}
                    </button>
                  )}
                </div>
                {userPlan !== 'Free' && (
                  <>
                    <div>
                      <h4 className="font-semibold text-stone-900 mb-4">Payment Method</h4>
                      <div className="p-6 bg-stone-50 rounded-xl">
                        <p className="text-stone-600 mb-2">•••• •••• •••• 4242</p>
                        <p className="text-sm text-stone-500">Expires 12/25</p>
                      </div>
                    </div>
                    <button className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors">
                      Update Payment Method
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Available Plans */}
            <div className="bg-white rounded-2xl border border-stone-200 p-8">
              <h3 className="text-xl font-semibold text-stone-900 mb-6">Available Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className={`border-2 rounded-2xl p-6 flex flex-col ${
                  userPlan === 'Free' 
                    ? 'border-stone-900 bg-stone-50' 
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all'
                }`}>
                  <div className="mb-4">
                    <h4 className="text-xl font-serif-ature font-semibold text-stone-900 mb-2">Free</h4>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-stone-900">$0</span>
                      <span className="text-stone-500 ml-2 text-sm">forever</span>
                    </div>
                    <p className="text-sm text-stone-600">Perfect for trying out ATURE Studio</p>
                  </div>
                  <ul className="flex-1 space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>5 AI blends per month</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Basic AR viewer</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Standard resolution exports</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Community support</span>
                    </li>
                  </ul>
                  {userPlan === 'Free' ? (
                    <div className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold text-center">
                      Current Plan
                    </div>
                  ) : (
                    <button className="px-4 py-2 bg-stone-100 text-stone-900 rounded-full text-sm font-semibold hover:bg-stone-200 transition-colors"
                      Select Plan
                    </button>
                  )}
                </div>

                {/* Pro Plan */}
                <div className={`border-2 rounded-2xl p-6 flex flex-col ${
                  userPlan === 'Pro' 
                    ? 'border-stone-900 bg-stone-50 shadow-xl' 
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all'
                }`}>
                  {userPlan !== 'Pro' && (
                    <div className="mb-4">
                      <span className="inline-block px-3 py-1 bg-stone-900 text-white text-xs font-bold tracking-wide rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className="text-xl font-serif-ature font-semibold text-stone-900 mb-2">Pro</h4>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-stone-900">$29</span>
                      <span className="text-stone-500 ml-2 text-sm">per month</span>
                    </div>
                    <p className="text-sm text-stone-600">For professional interior designers</p>
                  </div>
                  <ul className="flex-1 space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Unlimited AI blends</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Advanced AR viewer</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>High-resolution exports</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Priority support</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Project history</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Custom branding</span>
                    </li>
                  </ul>
                  {userPlan === 'Pro' ? (
                    <div className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold text-center">
                      Current Plan
                    </div>
                  ) : (
                    <button className="px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors">
                      {userPlan === 'Free' ? 'Upgrade to Pro' : 'Switch to Pro'}
                    </button>
                  )}
                </div>

                {/* Enterprise Plan */}
                <div className={`border-2 rounded-2xl p-6 flex flex-col ${
                  userPlan === 'Enterprise' 
                    ? 'border-stone-900 bg-stone-50' 
                    : 'border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all'
                }`}>
                  <div className="mb-4">
                    <h4 className="text-xl font-serif-ature font-semibold text-stone-900 mb-2">Enterprise</h4>
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-stone-900">Custom</span>
                    </div>
                    <p className="text-sm text-stone-600">For teams and agencies</p>
                  </div>
                  <ul className="flex-1 space-y-2 mb-6">
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Team collaboration</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>API access</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Dedicated support</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Custom integrations</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-stone-700">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-900 mt-0.5 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>SLA guarantee</span>
                    </li>
                  </ul>
                  {userPlan === 'Enterprise' ? (
                    <div className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold text-center">
                      Current Plan
                    </div>
                  ) : (
                    <button className="px-4 py-2 bg-stone-100 text-stone-900 rounded-full text-sm font-semibold hover:bg-stone-200 transition-colors"
                      Contact Sales
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-stone-900">My Projects</h3>
            </div>
            {savedProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 mx-auto mb-4">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <p className="text-stone-600 mb-2">No projects saved yet</p>
                <p className="text-sm text-stone-500">Create and save your first project</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProjects.map((project) => (
                  <div key={project.id} className="bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-300 hover:shadow-lg transition-all">
                    {project.workflow.result?.url ? (
                      <div className="h-32 bg-stone-100 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={project.workflow.result.url}
                          alt={project.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-32 bg-stone-100 rounded-lg mb-4 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                    <h4 className="font-semibold text-stone-900 mb-1">{project.name}</h4>
                    <p className="text-xs text-stone-500 mb-4">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

