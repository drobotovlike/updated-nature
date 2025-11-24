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

export default function PricingPage() {
  useRevealOnScroll()
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out ATURE Studio',
      features: [
        '5 AI blends per month',
        'Basic AR viewer',
        'Standard resolution exports',
        'Community support',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For professional interior designers',
      features: [
        'Unlimited AI blends',
        'Advanced AR viewer',
        'High-resolution exports',
        'Priority support',
        'Project history',
        'Custom branding',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For teams and agencies',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'API access',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="mb-16 md:mb-24 text-center">
        <div className="reveal-element">
          <h1 className="text-4xl md:text-6xl font-serif-ature font-semibold tracking-tight text-stone-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your workflow. All plans include our core AI blending and AR visualization features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {plans.map((plan, index) => (
          <div
            key={plan.name}
            className={`reveal-element bg-white rounded-2xl border-2 p-8 flex flex-col ${
              plan.popular
                ? 'border-stone-900 shadow-xl scale-105 md:scale-110'
                : 'border-stone-200 hover:border-stone-300 hover:shadow-lg transition-all'
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {plan.popular && (
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-stone-900 text-white text-xs font-bold tracking-wide rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            <h3 className="text-2xl font-serif-ature font-semibold text-stone-900 mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-stone-900">{plan.price}</span>
              {plan.period && <span className="text-stone-500 ml-2">{plan.period}</span>}
            </div>
            <p className="text-stone-600 text-sm mb-6">{plan.description}</p>
            <ul className="flex-1 space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
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
                    className="text-stone-900 mt-0.5 flex-shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-stone-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to={plan.name === 'Enterprise' ? '/contact' : '/studio'}
              className={`w-full py-3 px-6 rounded-full text-sm font-semibold transition-all ${
                plan.popular
                  ? 'bg-stone-900 text-white hover:bg-stone-800 hover:scale-105'
                  : 'bg-white border-2 border-stone-900 text-stone-900 hover:bg-stone-50'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* FAQ Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-serif-ature font-semibold text-stone-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              q: 'Can I change plans later?',
              a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards and PayPal. Enterprise plans can be invoiced.',
            },
            {
              q: 'Is there a free trial?',
              a: 'Yes! Pro plans come with a 14-day free trial. No credit card required.',
            },
            {
              q: 'What happens if I exceed my plan limits?',
              a: 'You\'ll be notified when approaching limits. You can upgrade or wait for the next billing cycle.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-300 transition-colors">
              <h3 className="font-semibold text-stone-900 mb-2">{faq.q}</h3>
              <p className="text-stone-600 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

