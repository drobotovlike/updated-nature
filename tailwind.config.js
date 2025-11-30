/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Blocks-style modern palette
        background: {
          base: '#FAFAFA', // clean light gray
          elevated: '#FFFFFF', // cards
          surface: '#F5F5F5', // secondary surfaces
        },
        surface: {
          base: '#FFFFFF', // cards, buttons
          elevated: '#FAFAFA', // secondary surfaces
          raised: '#FFFFFF',
        },
        accent: {
          clay: '#18181B', // dark for CTAs (blocks style)
          rattan: '#71717A', // subtle highlights
        },
        text: {
          primary: '#09090B', // near-black
          secondary: '#71717A', // medium gray
          tertiary: '#A1A1AA', // light gray
        },
        border: {
          DEFAULT: '#E4E4E7', // subtle gray border
        },
        primary: {
          400: '#18181B', // dark primary
          300: '#27272A', // hover state
        },
        error: {
          400: '#EF4444',
        },
        warning: {
          400: '#F59E0B',
        },
        success: {
          400: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Inter var', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        xs: ['clamp(0.75rem, 0.7rem + 0.25vw, 0.8rem)', { lineHeight: '1.5', letterSpacing: '0.01em' }],
        sm: ['clamp(0.875rem, 0.8rem + 0.375vw, 1rem)', { lineHeight: '1.5', letterSpacing: '0' }],
        base: ['clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', { lineHeight: '1.5', letterSpacing: '0' }],
        lg: ['clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        xl: ['clamp(1.5rem, 1.3rem + 1vw, 2rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '2xl': ['clamp(2rem, 1.7rem + 1.5vw, 2.5rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '3xl': ['clamp(3rem, 2.5rem + 2.5vw, 4rem)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      },
      spacing: {
        'clamp-2': 'clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem)',
        'clamp-4': 'clamp(0.5rem, 0.4rem + 0.5vw, 1rem)',
        'clamp-8': 'clamp(0.75rem, 0.6rem + 0.75vw, 1.5rem)',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '20': '20px', // For squircle
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'oak': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'clay-pressed': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.1)',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
      transitionDuration: {
        micro: '150ms',
        macro: '300ms',
      },
    },
  },
  plugins: [],
}
