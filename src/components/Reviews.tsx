import { Star } from "lucide-react"

/**
 * Real, attributed reviews pulled from bestbuyfloorsinc.com (Google/Birdeye),
 * trimmed for length. Not invented — see the audit performed before this
 * rebuild. Swap for a live Google/Birdeye widget when that's wired up.
 */
const REVIEWS = [
  {
    name: "Julie Nomi",
    timeAgo: "2 years ago",
    text: "Best Buy Floors are among the most professional, knowledgable flooring team and an honorable family business. They have equally skilled installers who are on time, problem solvers, and respectful. We had bathroom and laundry room floors that needed leveling, and a small doorway where we could not move the washer/dryer out. The floors and details turned out great — we are happy.",
  },
  {
    name: "Syeda Persia Aziz",
    timeAgo: "2 years ago",
    text: "We had a great experience with Best Buy Flooring. We took samples from them before deciding on the flooring. Alex helped us with a lot of information. We ran short of planks during the installation work and Alex was kind enough to drop the additional ones at our home. The price was reasonable. We went with Coretec LVP and the look and feel of the planks are great!",
  },
  {
    name: "Paula Chambers",
    timeAgo: "2 years ago",
    text: "Best Buy did a fabulous job renovating my kitchen counters, adding beautiful new LVP flooring throughout, and adding Italian stone surround and hearth to my fireplace. They were timely, communicated well, and accommodated my schedule with last-minute changes a couple times. Thanks Alex and crew!!",
  },
]

export function Reviews() {
  return (
    <section id="reviews" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10 lg:py-20">
        <div className="text-center">
          <h2 className="font-display text-3xl text-ink sm:text-4xl lg:text-[42px]">Hear From Our Customers</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-ink/70">
            Best Buy Floors is rated 4.9 on Google and 4.8 on Birdeye from 100+ reviews on each
            platform. See what local customers say about our flooring, remodeling, and
            installation support.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {REVIEWS.map((review) => (
            <div key={review.name} className="flex flex-col gap-3 rounded-sm border border-hairline p-6">
              <div className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={15} className="fill-gold text-gold" />
                ))}
              </div>
              <p className="line-clamp-6 text-sm leading-relaxed text-ink/75">{review.text}</p>
              <div className="mt-auto pt-2">
                <p className="text-sm font-semibold text-ink">{review.name}</p>
                <p className="text-xs text-ink/50">{review.timeAgo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
