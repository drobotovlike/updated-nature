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
        // Dark-mode first palette
        background: {
          base: '#0A0A0A',
          elevated: '#111111',
          surface: '#1C1C1E',
        },
        surface: {
          base: '#1F1F1F',
          elevated: '#242426',
          raised: '#2C2C2E',
        },
        primary: {
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#9CA3AF',
          tertiary: '#6B7280',
        },
        border: {
          DEFAULT: 'rgba(55, 65, 81, 0.6)',
        },
        error: {
          400: '#FB7185',
        },
        warning: {
          400: '#FBBF24',
        },
        success: {
          400: '#34D399',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
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
        md: '12px',
        lg: '16px',
        xl: '24px',
        '20': '20px', // For squircle
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.15)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.2)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.25)',
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
