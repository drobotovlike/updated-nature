import { SquircleClip } from './SquircleClip'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  icon,
  'aria-label': ariaLabel,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center gap-3 font-medium transition-all duration-micro ease-apple focus-ring touch-manipulation'
  
  const sizeClasses = {
    sm: 'h-8 px-2 text-sm',
    md: 'h-10 px-2 text-sm',
    lg: 'h-12 px-2 text-base',
  }
  
  const variantClasses = {
    primary: 'bg-primary-400 text-white hover:bg-primary-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all',
    secondary: 'bg-white text-text-primary border border-border hover:bg-surface-elevated shadow-sm hover:shadow disabled:opacity-50 transition-all',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-base hover:text-text-primary disabled:opacity-50 transition-all',
  }
  
  return (
    <>
      <SquircleClip />
      <button
        type={type}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} squircle`}
        disabled={disabled}
        onClick={onClick}
        aria-label={ariaLabel}
        {...props}
      >
        {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
        {children}
      </button>
    </>
  )
}

