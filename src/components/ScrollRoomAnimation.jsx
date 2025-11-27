import { useEffect, useRef, useState } from 'react'

export default function ScrollRoomAnimation() {
  const containerRef = useRef(null)
  const roomRef = useRef(null)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [furnitureVisible, setFurnitureVisible] = useState({
    sofa: false,
    chair: false,
    table: false,
    lamp: false,
    plant: false,
    rug: false,
  })

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      const windowHeight = window.innerHeight
      
      // Calculate scroll progress (0 to 1)
      const start = windowHeight * 0.5
      const end = -rect.height + windowHeight * 0.5
      const progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)))
      
      setScrollProgress(progress)

      // Trigger furniture appearance based on scroll progress
      setFurnitureVisible({
        sofa: progress > 0.1,
        chair: progress > 0.25,
        table: progress > 0.4,
        lamp: progress > 0.55,
        plant: progress > 0.7,
        rug: progress > 0.85,
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div 
      ref={containerRef}
      className="relative w-full min-h-[200vh] flex items-center justify-center"
    >
      {/* Sticky room container */}
      <div 
        ref={roomRef}
        className="sticky top-0 w-full max-w-7xl mx-auto aspect-[16/10] rounded-3xl overflow-hidden bg-gradient-to-br from-[#F6F2EE] to-[#F1EBE4] shadow-oak"
        style={{
          filter: 'drop-shadow(0 20px 40px rgba(44, 44, 44, 0.08))',
        }}
      >
        {/* Base room image */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=2600&auto=format&fit=crop" 
            alt="Empty room"
            className="w-full h-full object-cover"
            style={{
              filter: 'brightness(1.05) contrast(0.95)',
            }}
          />
        </div>

        {/* Furniture pieces - appear on scroll */}
        
        {/* Rug */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 transition-all duration-700 ease-out"
          style={{
            opacity: furnitureVisible.rug ? 1 : 0,
            transform: `translateX(-50%) translateY(${furnitureVisible.rug ? '0' : '20px'}) scale(${furnitureVisible.rug ? 1 : 0.95})`,
            transitionDelay: '0ms',
          }}
        >
          <div className="w-[60%] aspect-[3/2] bg-[#E8E0D8] rounded-2xl shadow-lg linen-texture" 
            style={{
              filter: 'drop-shadow(0 4px 12px rgba(44, 44, 44, 0.15))',
            }}
          />
        </div>

        {/* Sofa */}
        <div 
          className="absolute bottom-[15%] left-[10%] transition-all duration-700 ease-out"
          style={{
            opacity: furnitureVisible.sofa ? 1 : 0,
            transform: `translateX(${furnitureVisible.sofa ? '0' : '-30px'}) translateY(${furnitureVisible.sofa ? '0' : '20px'}) scale(${furnitureVisible.sofa ? 1 : 0.9})`,
            transitionDelay: '100ms',
          }}
        >
          <div className="w-64 h-40 bg-[#D4C4B0] rounded-2xl shadow-lg oak-grain"
            style={{
              filter: 'drop-shadow(0 8px 16px rgba(44, 44, 44, 0.2))',
            }}
          />
        </div>

        {/* Coffee Table */}
        <div 
          className="absolute bottom-[18%] left-[45%] transition-all duration-700 ease-out"
          style={{
            opacity: furnitureVisible.table ? 1 : 0,
            transform: `translateX(${furnitureVisible.table ? '0' : '20px'}) translateY(${furnitureVisible.table ? '0' : '30px'}) scale(${furnitureVisible.table ? 1 : 0.85})`,
            transitionDelay: '200ms',
          }}
        >
          <div className="w-48 h-32 bg-[#C5A26D] rounded-xl shadow-lg oak-grain"
            style={{
              filter: 'drop-shadow(0 6px 12px rgba(44, 44, 44, 0.18))',
            }}
          />
        </div>

        {/* Chair */}
        <div 
          className="absolute bottom-[15%] right-[15%] transition-all duration-700 ease-out"
          style={{
            opacity: furnitureVisible.chair ? 1 : 0,
            transform: `translateX(${furnitureVisible.chair ? '0' : '30px'}) translateY(${furnitureVisible.chair ? '0' : '20px'}) scale(${furnitureVisible.chair ? 1 : 0.9}) rotate(${furnitureVisible.chair ? '0deg' : '5deg'})`,
            transitionDelay: '150ms',
          }}
        >
          <div className="w-40 h-48 bg-[#E8DCC8] rounded-2xl shadow-lg rattan-pattern"
            style={{
              filter: 'drop-shadow(0 6px 12px rgba(44, 44, 44, 0.18))',
            }}
          />
        </div>

        {/* Lamp */}
        <div 
          className="absolute top-[25%] right-[20%] transition-all duration-700 ease-out"
          style={{
            opacity: furnitureVisible.lamp ? 1 : 0,
            transform: `translateY(${furnitureVisible.lamp ? '0' : '-40px'}) scale(${furnitureVisible.lamp ? 1 : 0.8})`,
            transitionDelay: '250ms',
          }}
        >
          <div className="w-16 h-32 bg-[#2C2C2C] rounded-full shadow-lg"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(44, 44, 44, 0.2))',
            }}
          />
        </div>

        {/* Plant */}
        <div 
          className="absolute bottom-[20%] left-[5%] transition-all duration-700 ease-out"
          style={{
            opacity: furnitureVisible.plant ? 1 : 0,
            transform: `translateY(${furnitureVisible.plant ? '0' : '30px'}) scale(${furnitureVisible.plant ? 1 : 0.85})`,
            transitionDelay: '300ms',
          }}
        >
          <div className="w-24 h-40 bg-[#7C9A6B] rounded-2xl shadow-lg"
            style={{
              filter: 'drop-shadow(0 6px 12px rgba(44, 44, 44, 0.18))',
            }}
          />
        </div>

        {/* Warm evening sun lighting effect */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
          style={{
            opacity: scrollProgress > 0.9 ? 0.15 : 0,
            background: 'radial-gradient(circle at 70% 30%, rgba(217, 119, 87, 0.3), transparent 60%)',
          }}
        />
      </div>
    </div>
  )
}

