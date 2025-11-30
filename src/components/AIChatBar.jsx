import { useRef, useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'

// Icon components (SVG replacements for tabler icons)
const IconMicrophone = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

const IconPaperclip = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

const IconPlus = ({ size = 24, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconSearch = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const IconSend = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
)

const IconSparkles = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
)

const IconWaveSine = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12c.552 0 1.005-.449.95-.998a6 6 0 0 1 8.568-5.026c.337.18.577.5.577.868v6.312c0 .223-.08.438-.223.606a4 4 0 1 0 4.646 6.64c.223-.08.438-.08.606.223h6.312c.368 0 .688.24.868.577A6 6 0 1 1 12.998 2.05C12.449 1.995 12 2.448 12 3v6.312c0 .223-.08.438-.223.606a4 4 0 1 0 4.646 6.64c.223-.08.438-.08.606.223h6.312c.368 0 .688.24.868.577A6 6 0 1 1 12.998 2.05" />
  </svg>
)

// Simple Dropdown Menu Component
function DropdownMenu({ children, trigger, align = "start", className }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={cn("absolute z-50 mt-1 bg-popover text-popover-foreground shadow-md rounded-2xl", className, align === "start" ? "left-0" : "right-0")}>
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownMenuContent({ children, className, align }) {
  return <div className={cn("p-1.5", className)}>{children}</div>
}

function DropdownMenuGroup({ children, className }) {
  return <div className={cn("space-y-1", className)}>{children}</div>
}

function DropdownMenuItem({ children, className, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent transition-colors", className)}
    >
      {children}
    </div>
  )
}

function DropdownMenuTrigger({ asChild, children }) {
  return <>{children}</>
}

// Simple Textarea Component (using forwardRef would be better, but keeping it simple)
const Textarea = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export default function AIChatBar({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything",
  onSelectReferenceImage,
  onClearReferenceImage,
  referenceImage,
  selectedItem,
}) {
  const [message, setMessage] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && onSubmit && !isLoading) {
      onSubmit(message.trim())
      setMessage("")
      setIsExpanded(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleTextareaChange = (e) => {
    setMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
    setIsExpanded(e.target.value.length > 100 || e.target.value.includes("\n"))
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = () => {
        if (onSelectReferenceImage) {
          onSelectReferenceImage(reader.result)
        }
      }
      reader.readAsDataURL(files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <form onSubmit={handleSubmit} className="group/composer w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          accept="image/*"
          onChange={handleFileSelect}
        />
        <div
          className={cn(
            "w-full mx-auto bg-transparent dark:bg-muted/50 cursor-text overflow-clip bg-clip-padding p-2.5 shadow-lg border border-border transition-all duration-200",
            {
              "rounded-3xl grid grid-cols-1 grid-rows-[auto_1fr_auto]": isExpanded,
              "rounded-[28px] grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto]": !isExpanded,
            }
          )}
          style={{
            gridTemplateAreas: isExpanded
              ? "'header' 'primary' 'footer'"
              : "'header header header' 'leading primary trailing' '. footer .'",
          }}
        >
          <div
            className={cn(
              "flex min-h-14 items-center overflow-x-hidden px-1.5",
              {
                "px-2 py-1 mb-0": isExpanded,
                "-my-2.5": !isExpanded,
              }
            )}
            style={{ gridArea: "primary" }}
          >
            <div className="flex-1 overflow-auto max-h-52">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="min-h-0 resize-none rounded-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin dark:bg-transparent bg-transparent w-full"
                rows={1}
                disabled={isLoading}
              />
            </div>
          </div>
          <div
            className={cn("flex", { hidden: isExpanded })}
            style={{ gridArea: "leading" }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full hover:bg-accent outline-none ring-0"
                >
                  <IconPlus className="size-6 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-w-xs rounded-2xl p-1.5"
              >
                <DropdownMenuGroup className="space-y-1">
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconPaperclip size={20} className="opacity-60" />
                    Add photos & files
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)]"
                    onClick={() => {}}
                  >
                    <div className="flex items-center gap-2">
                      <IconSparkles size={20} className="opacity-60" />
                      Agent mode
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)]"
                    onClick={() => {}}
                  >
                    <IconSearch size={20} className="opacity-60" />
                    Deep Research
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div
            className="flex items-center gap-2"
            style={{ gridArea: isExpanded ? "footer" : "trailing" }}
          >
            <div className="ms-auto flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-full hover:bg-accent"
              >
                <IconMicrophone className="size-5 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-full hover:bg-accent relative"
              >
                <IconWaveSine className="size-5 text-muted-foreground" />
              </Button>
              {message.trim() && !isLoading && (
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 w-9 rounded-full"
                  variant="primary"
                >
                  <IconSend className="size-5" />
                </Button>
              )}
              {isLoading && (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 w-9 rounded-full"
                  variant="primary"
                  disabled
                >
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
