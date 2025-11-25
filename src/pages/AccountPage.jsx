import { useState, useEffect } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { getProjects, deleteProject } from '../utils/projectManager'

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

export default function AccountPage() {
  useRevealOnScroll()
  const [activeTab, setActiveTab] = useState('profile')
  const { user, isLoaded } = useUser()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [savedProjects, setSavedProjects] = useState([])

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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

  // Get user data from Clerk
  const userName = user.fullName || user.firstName || 'User'
  const userEmail = user.primaryEmailAddress?.emailAddress || ''
  const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
  
  // For now, we'll use a default plan. In the future, this can come from a database
  const userPlan = 'Free' // This would come from your database/subscription system

  // Load projects when component mounts or when projects tab is selected
  useEffect(() => {
    if (userId && activeTab === 'projects') {
      const projects = getProjects(userId)
      setSavedProjects(projects)
    }
  }, [userId, activeTab])

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'projects', label: 'Projects' },
  ]

  const handleDeleteProject = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        deleteProject(userId, projectId)
        setSavedProjects(getProjects(userId))
      } catch (error) {
        console.error('Error deleting project:', error)
        alert('Failed to delete project')
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <section className="mb-12">
        <div className="reveal-element">
          <h1 className="text-4xl md:text-6xl font-serif-ature font-semibold tracking-tight text-stone-900 mb-4">
            Account Settings
          </h1>
          <p className="text-stone-600">Manage your account, billing, and project history.</p>
        </div>
      </section>

      {/* User Info Card */}
      <section className="mb-8">
        <div className="reveal-element bg-white rounded-2xl border border-stone-200 p-8">
          <div className="flex items-center gap-6 mb-6">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={userName}
                className="w-20 h-20 rounded-full object-cover border-2 border-stone-200"
              />
            ) : (
              <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-stone-400"
                >
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
      </section>

      {/* Tabs */}
      <section className="mb-8">
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
      </section>

      {/* Tab Content */}
      <section>
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
          <div className="bg-white rounded-2xl border border-stone-200 p-8">
            <h3 className="text-xl font-semibold text-stone-900 mb-6">Billing & Subscription</h3>
            <div className="space-y-6 max-w-2xl">
              <div className="flex justify-between items-center p-6 bg-stone-50 rounded-xl">
                <div>
                  <p className="font-semibold text-stone-900">{userPlan} Plan</p>
                  <p className="text-sm text-stone-600">
                    {userPlan === 'Free' 
                      ? 'Upgrade to Pro for unlimited features' 
                      : '$29/month • Next billing date: April 15, 2024'}
                  </p>
                </div>
                <button className="px-4 py-2 bg-white border border-stone-200 rounded-full text-sm font-semibold hover:bg-stone-50 transition-colors">
                  Change Plan
                </button>
              </div>
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
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-stone-900">My Projects</h3>
              <button
                onClick={() => navigate('/studio')}
                className="px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
              >
                New Project
              </button>
            </div>
            {savedProjects.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-stone-400 mx-auto mb-4"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <p className="text-stone-600 mb-2">No projects saved yet</p>
                <p className="text-sm text-stone-500 mb-6">Create and save your first project in Studio</p>
                <button
                  onClick={() => navigate('/studio')}
                  className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
                >
                  Go to Studio
                </button>
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-stone-400"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                    <h4 className="font-semibold text-stone-900 mb-2 truncate">{project.name}</h4>
                    <p className="text-sm text-stone-600 mb-4">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/studio')}
                        className="flex-1 px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
                      >
                        Open
                      </button>
                      {project.workflow.result?.url && (
                        <a
                          href={project.workflow.result.url}
                          download
                          className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-full text-sm font-medium hover:bg-stone-100 transition-colors"
                        >
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    {project.workflow.files && project.workflow.files.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-stone-200">
                        <p className="text-xs font-medium text-stone-700 mb-2">
                          {project.workflow.files.length} file{project.workflow.files.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

