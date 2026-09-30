import { useState } from "react"
import { ChevronDown, Menu, Phone, X } from "lucide-react"

const NAV_ITEMS: Array<{ label: string; hasDropdown?: boolean }> = [
  { label: "Flooring", hasDropdown: true },
  { label: "Brands" },
  { label: "Services", hasDropdown: true },
  { label: "Reviews" },
  { label: "Financing" },
  { label: "Inspiration" },
  { label: "About Us", hasDropdown: true },
  { label: "Contact" },
]

interface HeaderProps {
  onStartProject: () => void
}

export function Header({ onStartProject }: HeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-5 lg:px-10 xl:gap-6">
        <a href="#top" className="shrink-0">
          <img src="/images/logo.webp" alt="Bellevue Design Center, by Best Buy Floors" className="h-12 w-auto sm:h-14" />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex xl:gap-7">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={`#${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex items-center gap-1 whitespace-nowrap text-[15px] font-medium text-ink/85 transition-colors hover:text-gold-dark xl:text-base"
            >
              {item.label}
              {item.hasDropdown && <ChevronDown size={15} className="text-ink/50" aria-hidden="true" />}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <a
            href="tel:+14256999251"
            className="flex items-center gap-2 whitespace-nowrap text-base font-semibold text-ink hover:text-gold-dark"
          >
            <Phone size={17} className="text-gold shrink-0" aria-hidden="true" />
            +1 (425) 699-9251
          </a>
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
                key={item.label}
                href={`#${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-base font-medium text-ink/80"
                onClick={() => setOpen(false)}
              >
                {item.label}
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
