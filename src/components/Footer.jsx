import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border pt-8 pb-8 flex flex-col md:flex-row justify-between items-center text-xs font-medium text-text-tertiary px-4 md:px-6 max-w-[1800px] mx-auto">
      <div className="flex flex-wrap gap-6 mb-4 md:mb-0 justify-center md:justify-start">
        <Link to="/privacy" className="hover:text-text-primary transition-colors duration-micro ease-apple">Privacy</Link>
        <Link to="/terms" className="hover:text-text-primary transition-colors duration-micro ease-apple">Terms</Link>
        <Link to="/studio" className="hover:text-text-primary transition-colors duration-micro ease-apple">Studio API</Link>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors duration-micro ease-apple">GitHub</a>
      </div>
      <p className="text-center md:text-right text-text-tertiary">© {new Date().getFullYear()} Ature Inc. Powered by Gemini.</p>
    </footer>
  )
}

