import { X } from "lucide-react"

interface ChatLauncherProps {
  open: boolean
  onClick: () => void
}

export function ChatLauncher({ open, onClick }: ChatLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close assistant" : "Ask Alex at Best Buy Floors"}
      aria-expanded={open}
      className="group fixed bottom-16 right-5 z-50 flex items-center gap-2 rounded-full border border-gold/60 bg-paper px-3 py-2 shadow-lg transition-transform hover:scale-[1.03] sm:bottom-20 sm:right-6"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-paper">
        {open ? <X size={16} /> : <img src="/images/alex.webp" alt="" className="h-full w-full object-cover" />}
      </span>
      <span className="hidden pr-1 text-sm font-semibold text-ink sm:inline">{open ? "Close" : "Ask Alex"}</span>
    </button>
  )
}
