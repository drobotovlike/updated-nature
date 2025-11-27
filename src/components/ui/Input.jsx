export function Input({
  className = '',
  'aria-describedby': ariaDescribedBy,
  ...props
}) {
  return (
    <input
      className={`h-10 px-3 rounded-lg bg-surface-base text-text-primary placeholder:text-text-tertiary border border-border focus-ring transition-all duration-micro ease-apple ${className}`}
      aria-describedby={ariaDescribedBy}
      {...props}
    />
  )
}

