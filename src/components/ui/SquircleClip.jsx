// Squircle clip-path with k=0.5 (rounded-20)
export function SquircleClip() {
  return (
    <svg className="squircle-defs" aria-hidden="true">
      <defs>
        <clipPath id="squircle-clip" clipPathUnits="objectBoundingBox">
          <path d="M 0,0.5 C 0,0.223858 0.223858,0 0.5,0 L 0.5,0 C 0.776142,0 1,0.223858 1,0.5 L 1,0.5 C 1,0.776142 0.776142,1 0.5,1 L 0.5,1 C 0.223858,1 0,0.776142 0,0.5 Z" />
        </clipPath>
      </defs>
    </svg>
  )
}

