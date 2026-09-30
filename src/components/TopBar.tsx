interface TopBarProps {
  onStartProject: () => void
}

export function TopBar({ onStartProject }: TopBarProps) {
  return (
    <div className="hidden bg-ink text-paper md:block">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-6 py-2 text-xs tracking-wide">
        <p>Serving Bellevue, Redmond &amp; Surrounding Areas</p>
        <nav aria-label="Quick links" className="flex items-center gap-6">
          <a href="#showrooms" className="transition-colors hover:text-gold-light">
            Visit Our Showrooms
          </a>
          <button
            type="button"
            onClick={onStartProject}
            className="rounded-sm border border-gold px-3 py-1 text-gold-light transition-colors hover:bg-gold hover:text-ink"
          >
            Start Your Project
          </button>
        </nav>
      </div>
    </div>
  )
}
