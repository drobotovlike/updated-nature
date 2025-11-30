export function Input({
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}) {
  return (
    <input
      className={`h-10 px-3 rounded-lg bg-white text-text-primary placeholder:text-text-tertiary border border-border focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all duration-micro ease-apple ${className}`}
      aria-describedby={ariaDescribedBy}
      {...props}
    />
  )
}

