import { useState, useEffect } from 'react'

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

export default function HelpPage() {
  useRevealOnScroll()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = ['all', 'Getting Started', 'Studio', 'AI Blending', 'AR Viewer', 'Billing', 'Troubleshooting']

  const guides = [
    {
      id: 1,
      title: 'Getting Started with ATURE Studio',
      category: 'Getting Started',
      content: 'Learn how to create your first AI-powered furniture blend in minutes.',
    },
    {
      id: 2,
      title: 'Uploading and Managing Files',
      category: 'Studio',
      content: 'Best practices for uploading furniture and room images for optimal results.',
    },
    {
      id: 3,
      title: 'Understanding AI Blending Results',
      category: 'AI Blending',
      content: 'How to interpret and improve your AI-generated furniture blends.',
    },
    {
      id: 4,
      title: 'Using AR Viewer on Mobile',
      category: 'AR Viewer',
      content: 'Step-by-step guide to viewing 3D models in AR on iOS and Android devices.',
    },
    {
      id: 5,
      title: 'Troubleshooting Common Issues',
      category: 'Troubleshooting',
      content: 'Solutions for common problems like upload failures, slow processing, and AR compatibility.',
    },
    {
      id: 6,
      title: 'Managing Your Subscription',
      category: 'Billing',
      content: 'How to upgrade, downgrade, or cancel your subscription.',
    },
  ]

  const filteredGuides = guides.filter((guide) => {
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guide.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div>
      {/* Hero Section */}
      <section className="mb-16 md:mb-24 text-center">
        <div className="reveal-element">
          <h1 className="text-4xl md:text-6xl font-serif-ature font-semibold tracking-tight text-stone-900 mb-4">
            Help Center
          </h1>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto mb-8">
            Find answers to common questions and learn how to get the most out of ATURE Studio.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 pl-12 bg-white border-2 border-stone-200 rounded-full text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="mb-12">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Guides Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {filteredGuides.map((guide, index) => (
          <div
            key={guide.id}
            className="reveal-element bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-300 hover:shadow-lg transition-all cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <span className="inline-block px-3 py-1 bg-stone-100 text-stone-700 text-xs font-semibold rounded-full mb-3">
              {guide.category}
            </span>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">{guide.title}</h3>
            <p className="text-stone-600 text-sm">{guide.content}</p>
          </div>
        ))}
      </section>

      {filteredGuides.length === 0 && (
        <div className="text-center py-16">
          <p className="text-stone-500 mb-4">No guides found matching your search.</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
            }}
            className="text-stone-900 font-semibold hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Contact Support */}
      <section className="text-center">
        <div className="reveal-element bg-white rounded-2xl border border-stone-200 p-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-serif-ature font-semibold text-stone-900 mb-4">Still Need Help?</h2>
          <p className="text-stone-600 mb-8">
            Our support team is here to help. Get in touch and we'll respond within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@ature.ru"
              className="px-8 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              Email Support
            </a>
            <a
              href="https://discord.gg/ature"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white border-2 border-stone-900 text-stone-900 rounded-full text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              Join Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

