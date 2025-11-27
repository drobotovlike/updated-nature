export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-surface-base border border-border rounded-lg p-4 shadow-sm gap-2 flex flex-col ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

