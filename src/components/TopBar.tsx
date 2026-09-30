import { FileText, MapPin } from "lucide-react"

interface TopBarProps {
  onStartProject: () => void
}

export function TopBar({ onStartProject }: TopBarProps) {
  return (
    <div className="hidden bg-paper-warm md:block">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-2.5 text-sm text-ink/80 lg:px-10">
        <p>Serving Bellevue, Redmond &amp; Surrounding Areas</p>
        <nav aria-label="Quick links" className="flex items-center gap-3">
          <a
            href="#showrooms"
            className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-paper px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink/30"
          >
            <MapPin size={13} aria-hidden="true" />
            Visit Our Showrooms
          </a>
          <button
            type="button"
            onClick={onStartProject}
            className="flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-gold-dark"
          >
            <FileText size={13} aria-hidden="true" />
            Start Your Project
          </button>
        </nav>
      </div>
    </div>
  )
}
