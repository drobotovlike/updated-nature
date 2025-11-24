import { useEffect } from 'react'
import { Link } from 'react-router-dom'

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

export default function BlogPage() {
  useRevealOnScroll()
  const posts = [
    {
      id: 1,
      title: 'How AI is Transforming Interior Design',
      excerpt: 'Discover how designers are using AI-powered tools to visualize furniture in real spaces before making purchases.',
      author: 'Sarah Chen',
      date: 'March 15, 2024',
      category: 'Design',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'AR Visualization: The Future of Furniture Shopping',
      excerpt: 'Learn how augmented reality is revolutionizing how customers experience furniture in their own homes.',
      author: 'Michael Torres',
      date: 'March 10, 2024',
      category: 'Technology',
      image: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'Best Practices for AI-Powered Room Blending',
      excerpt: 'Tips and tricks for getting the most realistic results when blending furniture into room environments.',
      author: 'Emily Rodriguez',
      date: 'March 5, 2024',
      category: 'Tutorial',
      image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=800&auto=format&fit=crop',
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="mb-16 md:mb-24 text-center">
        <div className="reveal-element">
          <h1 className="text-4xl md:text-6xl font-serif-ature font-semibold tracking-tight text-stone-900 mb-4">
            Blog
          </h1>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">
            Insights, tutorials, and stories about AI-powered design and visualization.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      {posts[0] && (
        <section className="mb-16">
          <Link
            to={`/blog/${posts[0].id}`}
            className="reveal-element block bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-300 hover:shadow-lg transition-all group"
          >
            <div className="md:flex">
              <div className="md:w-1/2 h-64 md:h-auto">
                <img
                  src={posts[0].image}
                  alt={posts[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <span className="inline-block px-3 py-1 bg-stone-100 text-stone-700 text-xs font-semibold rounded-full mb-4 w-fit">
                  {posts[0].category}
                </span>
                <h2 className="text-3xl md:text-4xl font-serif-ature font-semibold text-stone-900 mb-4 group-hover:text-stone-700 transition-colors">
                  {posts[0].title}
                </h2>
                <p className="text-stone-600 mb-6">{posts[0].excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-stone-500">
                  <span>{posts[0].author}</span>
                  <span>•</span>
                  <span>{posts[0].date}</span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Blog Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.slice(1).map((post, index) => (
          <Link
            key={post.id}
            to={`/blog/${post.id}`}
            className="reveal-element bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-300 hover:shadow-lg transition-all group"
            style={{ animationDelay: `${(index + 1) * 100}ms` }}
          >
            <div className="h-48 overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-6">
              <span className="inline-block px-3 py-1 bg-stone-100 text-stone-700 text-xs font-semibold rounded-full mb-3">
                {post.category}
              </span>
              <h3 className="text-xl font-serif-ature font-semibold text-stone-900 mb-2 group-hover:text-stone-700 transition-colors">
                {post.title}
              </h3>
              <p className="text-stone-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center gap-4 text-xs text-stone-500">
                <span>{post.author}</span>
                <span>•</span>
                <span>{post.date}</span>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}

