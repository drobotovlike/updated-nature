import { useEffect } from 'react'

export function FontPreload() {
  useEffect(() => {
    const link1 = document.createElement('link')
    link1.rel = 'preload'
    link1.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
    link1.as = 'style'
    link1.crossOrigin = 'anonymous'
    
    const link2 = document.createElement('link')
    link2.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'
    link2.rel = 'stylesheet'
    link2.crossOrigin = 'anonymous'
    
    document.head.appendChild(link1)
    document.head.appendChild(link2)
    
    return () => {
      document.head.removeChild(link1)
      document.head.removeChild(link2)
    }
  }, [])
  
  return null
}

