import { X } from "lucide-react"

interface ChatHeaderProps {
  onClose: () => void
}

export function ChatHeader({ onClose }: ChatHeaderProps) {
  return (
    <div className="border-b border-hairline bg-paper-warm px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/alex.webp"
            alt="Alex"
            className="h-11 w-11 shrink-0 rounded-full border border-gold/40 object-cover"
          />
          <div>
            <p className="font-display text-lg leading-tight text-ink">Alex</p>
            <p className="text-xs font-medium text-ink/70">Best Buy Floors</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink/60">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-status-pulse rounded-full bg-green-600" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-600" />
            </span>
            Active now
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-sm p-1 text-ink/50 hover:bg-hairline hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink/50">Virtual assistant for Alex &amp; Best Buy Floors</p>
    </div>
  )
}
