import Navigation from './Navigation'
import Footer from './Footer'

export default function Layout({ children }) {
  return (
    <div className="bg-background-base min-h-screen text-text-primary antialiased overflow-x-hidden">
      <Navigation />
      <main className="pt-32 pb-20 px-4 md:px-6 max-w-[1800px] mx-auto safe-area-x">
        {children}
      </main>
      <Footer />
    </div>
  )
}

