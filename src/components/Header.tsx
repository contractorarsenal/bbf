import { useState } from "react"
import { Menu, Phone, X } from "lucide-react"

const NAV_ITEMS = ["Flooring", "Brands", "Services", "Reviews", "Financing", "Inspiration", "About Us", "Contact"]

interface HeaderProps {
  onStartProject: () => void
}

export function Header({ onStartProject }: HeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-6 py-4">
        <a href="#top" className="leading-tight">
          <span className="block font-display text-2xl tracking-wide text-ink sm:text-3xl">
            Bellevue Design Center
          </span>
          <span className="block text-[11px] uppercase tracking-[0.2em] text-ink/60">By Best Buy Floors</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm font-medium text-ink/80 transition-colors hover:text-gold-dark"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="tel:+14256999251"
            className="flex items-center gap-2 text-sm font-semibold text-ink hover:text-gold-dark"
          >
            <Phone size={16} className="text-gold" aria-hidden="true" />
            +1 (425) 699-9251
          </a>
          <button
            type="button"
            onClick={onStartProject}
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-gold hover:text-ink"
          >
            Start Your Project
          </button>
        </div>

        <button
          type="button"
          className="flex items-center justify-center rounded-sm border border-hairline p-2 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-hairline bg-paper px-6 pb-6 lg:hidden">
          <nav aria-label="Primary mobile" className="flex flex-col gap-4 pt-4">
            {NAV_ITEMS.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-base font-medium text-ink/80"
                onClick={() => setOpen(false)}
              >
                {item}
              </a>
            ))}
            <a href="tel:+14256999251" className="flex items-center gap-2 text-base font-semibold text-ink">
              <Phone size={16} className="text-gold" aria-hidden="true" />
              +1 (425) 699-9251
            </a>
            <button
              type="button"
              className="rounded-sm bg-ink px-5 py-3 text-center text-sm font-semibold text-paper"
              onClick={() => {
                setOpen(false)
                onStartProject()
              }}
            >
              Start Your Project
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
