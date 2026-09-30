import { Phone, Star } from "lucide-react"

interface HeroProps {
  onStartProject: () => void
}

export function Hero({ onStartProject }: HeroProps) {
  return (
    <section id="top" className="border-b border-hairline bg-paper-warm">
      <div className="mx-auto grid max-w-[1380px] items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">
            Family Owned Since 1990
          </p>
          <h1 className="font-display text-4xl leading-[1.05] text-ink sm:text-5xl lg:text-[3.4rem]">
            Everything Your Home Needs. <span className="text-gold-dark">One Showroom</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink/75 sm:text-lg">
            Flooring. Cabinets. Countertops. Wallpaper. Expert guidance. Everything you need to
            create a beautifully coordinated home across Bellevue, Redmond, Seattle, Kirkland,
            Renton, Sammamish, and nearby Washington communities.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartProject}
              className="rounded-sm bg-ink px-7 py-3.5 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-gold hover:text-ink"
            >
              Start Your Project
            </button>
            <a
              href="tel:+14256999251"
              className="flex items-center justify-center gap-2 rounded-sm border border-ink/20 px-7 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
            >
              <Phone size={16} aria-hidden="true" />
              Call Us Now
            </a>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-hairline pt-8 sm:grid-cols-4">
            <div>
              <dt className="sr-only">Google rating</dt>
              <dd className="flex items-center gap-1 font-display text-2xl text-ink">
                4.9
                <Star size={16} className="fill-gold text-gold" aria-hidden="true" />
              </dd>
              <p className="text-xs text-ink/60">Based on 230+ reviews</p>
            </div>
            <div>
              <dd className="font-display text-2xl text-ink">2</dd>
              <p className="text-xs text-ink/60">Local Showrooms</p>
            </div>
            <div>
              <dd className="font-display text-2xl text-ink">0% APR</dd>
              <p className="text-xs text-ink/60">Financing Available</p>
            </div>
            <div>
              <dd className="font-display text-2xl text-ink">10,000+</dd>
              <p className="text-xs text-ink/60">Projects Completed</p>
            </div>
          </dl>
        </div>

        <div
          className="relative aspect-[4/5] overflow-hidden rounded-sm border border-hairline shadow-sm lg:aspect-[3/4]"
          style={{
            background:
              "linear-gradient(155deg, #efe6d3 0%, #e4d3ab 35%, #cda86a 68%, #a97a0f 100%)",
          }}
          role="img"
          aria-label="Best Buy Floors showroom featuring flooring, cabinet, and countertop displays"
        >
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0 p-6">
            <p className="font-display text-xl text-paper drop-shadow">Bellevue Showroom</p>
          </div>
        </div>
      </div>
    </section>
  )
}
