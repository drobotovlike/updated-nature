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
    primary: 'bg-primary-400 text-background-base hover:bg-primary-300 hover:-translate-y-[1px] active:scale-[0.95] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0',
    secondary: 'bg-surface-elevated text-text-primary hover:bg-surface-raised hover:-translate-y-[1px] active:scale-[0.95] active:translate-y-0 disabled:opacity-50 disabled:translate-y-0',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-base hover:-translate-y-[1px] active:scale-[0.95] active:translate-y-0 disabled:opacity-50 disabled:translate-y-0',
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

