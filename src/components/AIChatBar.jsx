import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'

// Icon components (using SVG instead of tabler icons)
const IconArrowUp = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
)

const IconPlus = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconAdjustmentsHorizontal = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 4H3" />
    <path d="M14 8H3" />
    <path d="M21 12H3" />
    <path d="M14 16H3" />
    <path d="M21 20H3" />
    <path d="M14 4v4" />
    <path d="M14 12v4" />
  </svg>
)

const IconPaperclip = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
)

const IconLink = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IconClipboard = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IconTemplate = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)

const IconSparkles = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
)

const IconPlayerPlay = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const IconHistory = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const IconX = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconCirclePlus = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
)

const IconCamera = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
)

const IconBrandFigma = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
    <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
    <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
  </svg>
)

const IconFileUpload = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const IconLayoutDashboard = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
)

const ACTIONS = [
  { id: "clone-screenshot", icon: IconCamera, label: "Clone a Screenshot" },
  { id: "import-figma", icon: IconBrandFigma, label: "Import from Figma" },
  { id: "upload-project", icon: IconFileUpload, label: "Upload a Project" },
  { id: "landing-page", icon: IconLayoutDashboard, label: "Landing Page" },
]

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

// Simple Badge Component
function Badge({ children, variant = "outline", className }) {
  const variantClasses = {
    outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
  }
  return (
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variantClasses[variant], className)}>
      {children}
    </div>
  )
}

// Simple Switch Component
function Switch({ checked, onCheckedChange, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

// Simple Label Component
function Label({ children, className, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </label>
  )
}

// Simple Textarea Component
function Textarea({ className, ...props }) {
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
  onUploadReferenceImage,
  onSelectReferenceImage,
  onClearReferenceImage,
  referenceImage,
  selectedItem,
}) {
  const [prompt, setPrompt] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const fileInputRef = useRef(null)

  const [settings, setSettings] = useState({
    autoComplete: true,
    streaming: false,
    showHistory: false,
  })

  const generateFileId = () => Math.random().toString(36).substring(7)

  const processFiles = (files) => {
    for (const file of files) {
      const fileId = generateFileId()
      const attachedFile = {
        id: fileId,
        name: file.name,
        file,
      }

      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = () => {
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, preview: reader.result } : f
            )
          )
        }
        reader.readAsDataURL(file)
      }

      setAttachedFiles((prev) => [...prev, attachedFile])
    }
  }

  const submitPrompt = () => {
    if (prompt.trim() && onSubmit) {
      onSubmit(prompt.trim())
      setPrompt("")
      setAttachedFiles([])
    }
  }

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submitPrompt()
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFiles(files)
    }
  }

  const handleTextareaChange = (e) => {
    setPrompt(e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submitPrompt()
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    processFiles(files)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const handleAttachFile = () => {
    if (selectedItem && onSelectReferenceImage) {
      onSelectReferenceImage(selectedItem.image_url)
    } else {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <div className="relative z-10 flex flex-col w-full mx-auto content-center">
        <form
          className="overflow-visible rounded-xl border border-border bg-card p-2 transition-colors duration-200 focus-within:border-ring shadow-sm"
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onSubmit={handleSubmit}
        >
          {(attachedFiles.length > 0 || referenceImage) && (
            <div className="relative flex w-fit items-center gap-2 mb-2 overflow-hidden">
              {referenceImage && (
                <Badge
                  variant="outline"
                  className="group relative h-6 max-w-30 cursor-pointer overflow-hidden text-[13px] transition-colors hover:bg-accent px-0"
                >
                  <span className="flex h-full items-center gap-1.5 overflow-hidden pl-1 font-normal">
                    <div className="relative flex h-4 min-w-4 items-center justify-center">
                      <img
                        alt="Reference"
                        className="absolute inset-0 h-4 w-4 rounded border object-cover"
                        src={referenceImage}
                        width={16}
                        height={16}
                      />
                    </div>
                    <span className="inline overflow-hidden truncate pr-1.5 transition-all">
                      Reference
                    </span>
                  </span>
                  <button
                    className="absolute right-1 z-10 rounded-sm p-0.5 text-muted-foreground opacity-0 focus-visible:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault()
                      onClearReferenceImage?.()
                    }}
                    type="button"
                  >
                    <IconX size={12} />
                  </button>
                </Badge>
              )}
              {attachedFiles.map((file) => (
                <Badge
                  variant="outline"
                  className="group relative h-6 max-w-30 cursor-pointer overflow-hidden text-[13px] transition-colors hover:bg-accent px-0"
                  key={file.id}
                >
                  <span className="flex h-full items-center gap-1.5 overflow-hidden pl-1 font-normal">
                    <div className="relative flex h-4 min-w-4 items-center justify-center">
                      {file.preview ? (
                        <img
                          alt={file.name}
                          className="absolute inset-0 h-4 w-4 rounded border object-cover"
                          src={file.preview}
                          width={16}
                          height={16}
                        />
                      ) : (
                        <IconPaperclip className="opacity-60" size={12} />
                      )}
                    </div>
                    <span className="inline overflow-hidden truncate pr-1.5 transition-all">
                      {file.name}
                    </span>
                  </span>
                  <button
                    className="absolute right-1 z-10 rounded-sm p-0.5 text-muted-foreground opacity-0 focus-visible:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background group-hover:opacity-100"
                    onClick={() => handleRemoveFile(file.id)}
                    type="button"
                  >
                    <IconX size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Textarea
            className="max-h-50 min-h-12 resize-none rounded-none border-none bg-transparent! p-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            value={prompt}
            disabled={isLoading}
          />

          <div className="flex items-center gap-1">
            <div className="flex items-end gap-0.5 sm:gap-1">
              <input
                className="sr-only"
                multiple
                onChange={handleFileSelect}
                ref={fileInputRef}
                type="file"
                accept="image/*"
              />

              <DropdownMenu
                trigger={
                  <Button
                    className="ml-[-2px] h-7 w-7 rounded-md"
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <IconPlus size={16} />
                  </Button>
                }
                align="start"
                className="max-w-xs"
              >
                <DropdownMenuContent className="rounded-2xl p-1.5">
                  <DropdownMenuGroup className="space-y-1">
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={handleAttachFile}
                    >
                      <div className="flex items-center gap-2">
                        <IconPaperclip className="text-muted-foreground" size={16} />
                        <span>Attach Files</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                      <div className="flex items-center gap-2">
                        <IconLink className="text-muted-foreground" size={16} />
                        <span>Import from URL</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                      <div className="flex items-center gap-2">
                        <IconClipboard className="text-muted-foreground" size={16} />
                        <span>Paste from Clipboard</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="rounded-[calc(1rem-6px)] text-xs">
                      <div className="flex items-center gap-2">
                        <IconTemplate className="text-muted-foreground" size={16} />
                        <span>Use Template</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu
                trigger={
                  <Button
                    className="size-7 rounded-md"
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <IconAdjustmentsHorizontal size={16} />
                  </Button>
                }
                align="start"
                className="w-48"
              >
                <DropdownMenuContent className="rounded-2xl p-3">
                  <DropdownMenuGroup className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconSparkles className="text-muted-foreground" size={16} />
                        <Label className="text-xs">Auto-complete</Label>
                      </div>
                      <Switch
                        checked={settings.autoComplete}
                        className="scale-75"
                        onCheckedChange={(value) =>
                          updateSetting("autoComplete", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconPlayerPlay className="text-muted-foreground" size={16} />
                        <Label className="text-xs">Streaming</Label>
                      </div>
                      <Switch
                        checked={settings.streaming}
                        className="scale-75"
                        onCheckedChange={(value) =>
                          updateSetting("streaming", value)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconHistory className="text-muted-foreground" size={16} />
                        <Label className="text-xs">Show History</Label>
                      </div>
                      <Switch
                        checked={settings.showHistory}
                        className="scale-75"
                        onCheckedChange={(value) =>
                          updateSetting("showHistory", value)
                        }
                      />
                    </div>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
              <Button
                className="h-7 w-7 rounded-md"
                disabled={!prompt.trim() || isLoading}
                size="sm"
                type="submit"
                variant="primary"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconArrowUp size={16} />
                )}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center pointer-events-none z-20 rounded-[inherit] border border-border border-dashed bg-muted text-foreground text-sm transition-opacity duration-200",
              isDragOver ? "opacity-100" : "opacity-0"
            )}
          >
            <span className="flex w-full items-center justify-center gap-1 font-medium">
              <IconCirclePlus className="min-w-4" size={16} />
              Drop files here to add as attachments
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}
