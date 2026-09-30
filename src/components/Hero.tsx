import { Phone, Star, Tag, MapPin as PinIcon } from "lucide-react"

interface HeroProps {
  onStartProject: () => void
}

export function Hero({ onStartProject }: HeroProps) {
  return (
    <section id="top" className="texture-diagonal border-b border-hairline bg-paper-warm">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-14 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:py-20">
        <div>
          <p className="mb-5 text-base text-ink/70">Family Owned Since 1990</p>
          <h1 className="font-display text-[42px] leading-[1.05] text-ink sm:text-[54px] lg:text-[66px] lg:leading-[1.04]">
            Everything Your Home Needs. <span className="text-gold-dark">One Showroom</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/75">
            Flooring. Cabinets. Countertops. Wallpaper. Expert guidance. Everything you need to
            create a beautifully coordinated home across Bellevue, Redmond, Seattle, Kirkland,
            Renton, Sammamish, and nearby Washington communities.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartProject}
              className="rounded-sm bg-gold px-7 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-gold-dark"
            >
              Start Your Project
            </button>
            <a
              href="tel:+14256999251"
              className="flex items-center justify-center gap-2 rounded-sm border border-ink/20 px-7 py-3.5 text-base font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
            >
              <Phone size={17} aria-hidden="true" />
              Call Us Now
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-ink/75">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
              <span className="font-semibold text-ink">4.9</span>
              <span className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-gold text-gold" />
                ))}
              </span>
              <span>Based on 230+ reviews</span>
            </span>
            <span className="h-4 w-px bg-hairline" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <PinIcon size={15} className="text-gold" aria-hidden="true" />
              2 Local Showrooms
            </span>
            <span className="h-4 w-px bg-hairline" aria-hidden="true" />
            <span className="flex items-center gap-1.5">
              <Tag size={15} className="text-gold" aria-hidden="true" />
              0% APR
            </span>
          </div>
        </div>

        <div className="relative aspect-[543/460] overflow-hidden rounded-sm shadow-sm lg:aspect-auto lg:h-[460px]">
          <img
            src="/images/showroom.webp"
            alt="Best Buy Floors showroom storefront in Bellevue"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
