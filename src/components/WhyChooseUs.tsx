const POINTS = [
  "Family Owned Since 1990",
  "10,000+ Projects Completed",
  "230+ 5-Star Reviews",
  "Two Luxury Showrooms",
  "Flooring, Cabinets, Countertops & More",
]

interface WhyChooseUsProps {
  onStartProject: () => void
}

export function WhyChooseUs({ onStartProject }: WhyChooseUsProps) {
  return (
    <section className="border-b border-hairline bg-paper">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-20">
        <div className="overflow-hidden rounded-sm">
          <img
            src="/images/team.webp"
            alt="Best Buy Floors team member greeting a customer in the showroom"
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl lg:text-[42px]">
            Why Homeowners Choose Best Buy Floors
          </h2>
          <p className="mt-5 text-base leading-relaxed text-ink/75">
            Bellevue Design Center by Best Buy Floors is a family-owned flooring and remodeling
            showroom trusted by homeowners across Bellevue, Redmond, and the greater Eastside.
            From humble beginnings in Jalisco, Mexico, Miguel Sr. built his career through hard
            work, resilience, and a commitment to quality installation.
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink/75">
            Starting a home project can feel overwhelming when there are too many products,
            styles, and decisions to compare. Best Buy Floors brings everything together with
            expert guidance, in-person showroom support, trusted recommendations, and a team
            focused on helping you choose with confidence.
          </p>

          <ul className="mt-6 space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-base text-ink">
                <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartProject}
              className="rounded-sm bg-gold px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-dark"
            >
              Talk To The Team
            </button>
            <a
              href="#flooring"
              className="rounded-sm border border-ink/20 px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-gold hover:text-gold-dark"
            >
              Our Work
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
