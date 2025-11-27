import { useState, useEffect, useRef } from 'react'

export default function AnimatedRoom() {
  const [visibleItems, setVisibleItems] = useState([])
  const roomRef = useRef(null)
  const observerRef = useRef(null)

  const furniturePieces = [
    {
      id: 'sofa',
      name: 'Contemporary Sofa',
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      position: { left: '15%', bottom: '25%' },
      size: { width: '35%', height: 'auto' },
      delay: 0,
    },
    {
      id: 'coffee-table',
      name: 'Minimalist Coffee Table',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
      position: { left: '50%', bottom: '20%' },
      size: { width: '20%', height: 'auto' },
      delay: 500,
    },
    {
      id: 'armchair',
      name: 'Designer Armchair',
      image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80',
      position: { right: '20%', bottom: '30%' },
      size: { width: '18%', height: 'auto' },
      delay: 1000,
    },
    {
      id: 'lamp',
      name: 'Modern Floor Lamp',
      image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80',
      position: { right: '15%', bottom: '15%' },
      size: { width: '8%', height: 'auto' },
      delay: 1500,
    },
    {
      id: 'plant',
      name: 'Decorative Plant',
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
      position: { left: '10%', bottom: '15%' },
      size: { width: '12%', height: 'auto' },
      delay: 2000,
    },
    {
      id: 'artwork',
      name: 'Abstract Artwork',
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80',
      position: { left: '50%', top: '20%' },
      size: { width: '25%', height: 'auto' },
      delay: 2500,
    },
  ]

  useEffect(() => {
    const room = roomRef.current
    if (!room) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Show furniture pieces one by one
            furniturePieces.forEach((piece, index) => {
              setTimeout(() => {
                setVisibleItems((prev) => {
                  if (!prev.includes(piece.id)) {
                    return [...prev, piece.id]
                  }
                  return prev
                })
              }, piece.delay)
            })
          }
        })
      },
      { threshold: 0.3 }
    )

    observerRef.current.observe(room)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div
      ref={roomRef}
      className="relative w-full h-[600px] md:h-[800px] rounded-3xl overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 shadow-2xl"
    >
      {/* Base room image - empty room */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=2000&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Furniture pieces that appear on scroll */}
      {furniturePieces.map((piece) => {
        const isVisible = visibleItems.includes(piece.id)
        return (
          <div
            key={piece.id}
            className={`absolute transition-all duration-1000 ease-out ${
              isVisible
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-8 scale-95'
            }`}
            style={{
              ...piece.position,
              ...piece.size,
              transitionDelay: `${piece.delay}ms`,
            }}
          >
            <div className="relative w-full h-full rounded-lg overflow-hidden shadow-xl border-2 border-white/50">
              <img
                src={piece.image}
                alt={piece.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isVisible && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              )}
            </div>
            {isVisible && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
                  {piece.name}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Progress indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="bg-white/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-stone-200">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              {visibleItems.length} / {furniturePieces.length} pieces placed
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

