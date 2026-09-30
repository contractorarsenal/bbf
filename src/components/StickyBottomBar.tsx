import { Phone, Send } from "lucide-react"

interface StickyBottomBarProps {
  onGetQuote: () => void
}

export function StickyBottomBar({ onGetQuote }: StickyBottomBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex text-sm font-semibold sm:text-base">
      <a href="tel:+14256999251" className="flex flex-1 items-center justify-center gap-2 bg-gold py-3 text-ink transition-colors hover:bg-gold-dark">
        <Phone size={16} aria-hidden="true" />
        +1 (425) 699-9251
      </a>
      <button
        type="button"
        onClick={onGetQuote}
        className="flex flex-1 items-center justify-center gap-2 bg-ink py-3 text-paper transition-colors hover:bg-ink/85"
      >
        <Send size={16} aria-hidden="true" />
        Get A Quote
      </button>
    </div>
  )
}
