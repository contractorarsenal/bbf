const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-12 lg:px-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <p className="font-display text-xl">Bellevue Design Center</p>
            <p className="text-xs uppercase tracking-[0.2em] text-paper/60">By Best Buy Floors</p>
            <p className="mt-4 text-sm text-paper/70">Family owned since 1990.</p>
          </div>
          <div className="text-sm text-paper/70">
            <p className="mb-2 font-semibold text-paper">Serving</p>
            <p>Bellevue, Redmond, Seattle, Kirkland, Renton, Sammamish &amp; nearby WA communities</p>
          </div>
          <div className="text-sm text-paper/70">
            <p className="mb-2 font-semibold text-paper">Contact</p>
            <a href="tel:+14256999251" className="hover:text-gold-light">
              +1 (425) 699-9251
            </a>
          </div>
        </div>
        <p className="mt-10 border-t border-paper/10 pt-6 text-xs text-paper/40">
          &copy; {CURRENT_YEAR} Best Buy Floors Inc. Standalone demo — not the production website.
        </p>
      </div>
    </footer>
  )
}
