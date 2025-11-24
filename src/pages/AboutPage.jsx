import { useEffect } from 'react'

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

export default function AboutPage() {
  useRevealOnScroll()
  return (
    <div>
      {/* Hero Section */}
      <section className="mb-16 md:mb-24 text-center">
        <div className="reveal-element">
          <h1 className="text-4xl md:text-6xl font-serif-ature font-semibold tracking-tight text-stone-900 mb-4">
            About ATURE Studio
          </h1>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">
            We're building the future of interior design visualization, powered by AI and AR.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="reveal-element">
            <h2 className="text-3xl font-serif-ature font-semibold text-stone-900 mb-4">Our Mission</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              ATURE Studio was born from a simple observation: interior designers spend too much time trying to help clients visualize furniture in their spaces. We believe technology should bridge that gap.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Our AI-powered platform combines the precision of Google's Gemini AI with intuitive AR visualization, allowing designers to create stunning presentations in minutes, not hours.
            </p>
          </div>
          <div className="reveal-element">
            <div className="bg-stone-100 rounded-2xl p-8 h-64 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-stone-400"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="mb-20">
        <h2 className="text-3xl font-serif-ature font-semibold text-stone-900 mb-8 text-center">Roadmap</h2>
        <div className="max-w-4xl mx-auto space-y-6">
          {[
            { quarter: 'Q2 2024', features: ['Team collaboration', 'API access', 'Custom branding'] },
            { quarter: 'Q3 2024', features: ['Mobile app', '3D model library', 'Advanced lighting controls'] },
            { quarter: 'Q4 2024', features: ['VR support', 'AI style suggestions', 'Integration marketplace'] },
          ].map((item, idx) => (
            <div key={idx} className="reveal-element bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-300 transition-colors">
              <h3 className="text-xl font-semibold text-stone-900 mb-3">{item.quarter}</h3>
              <ul className="space-y-2">
                {item.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-3 text-stone-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-stone-400"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-serif-ature font-semibold text-stone-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              q: 'How accurate is the AI blending?',
              a: 'Our Gemini-powered AI analyzes lighting, perspective, and shadows to create highly realistic blends. Results are typically 90%+ accurate for most room types.',
            },
            {
              q: 'What file formats do you support?',
              a: 'We support JPG, PNG for images, and GLB, GLTF, USDZ, OBJ, FBX for 3D models. Maximum file size is 50MB.',
            },
            {
              q: 'Can I use this for commercial projects?',
              a: 'Yes! All Pro and Enterprise plans include commercial licensing. Free plans are for personal use only.',
            },
            {
              q: 'Do you offer refunds?',
              a: 'Yes, we offer a 30-day money-back guarantee on all paid plans. No questions asked.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="reveal-element bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-300 transition-colors">
              <h3 className="font-semibold text-stone-900 mb-2">{faq.q}</h3>
              <p className="text-stone-600 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="text-center">
        <div className="reveal-element bg-white rounded-2xl border border-stone-200 p-12 max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif-ature font-semibold text-stone-900 mb-4">Get in Touch</h2>
          <p className="text-stone-600 mb-8">
            Have questions or feedback? We'd love to hear from you.
          </p>
          <a
            href="mailto:hello@ature.ru"
            className="inline-block px-8 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  )
}

