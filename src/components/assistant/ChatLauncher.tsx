import { MessageCircle, X } from "lucide-react"

interface ChatLauncherProps {
  open: boolean
  onClick: () => void
}

export function ChatLauncher({ open, onClick }: ChatLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close assistant" : "Ask Best Buy Floors"}
      aria-expanded={open}
      className="group fixed bottom-16 right-5 z-50 flex items-center gap-2 rounded-full border border-gold/60 bg-paper px-4 py-3 shadow-lg transition-transform hover:scale-[1.03] sm:bottom-20 sm:right-6"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">
        {open ? <X size={16} /> : <MessageCircle size={16} />}
      </span>
      <span className="hidden pr-1 text-sm font-semibold text-ink sm:inline">
        {open ? "Close" : "Ask Best Buy Floors"}
      </span>
    </button>
  )
}
