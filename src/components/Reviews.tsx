import { Star } from "lucide-react"

/**
 * No real review text was supplied for this demo, so placeholder cards are
 * clearly labeled as such rather than presenting invented quotes as genuine
 * customer reviews. Swap in real Google review content before launch.
 */
const PLACEHOLDER_COUNT = 3

export function Reviews() {
  return (
    <section id="reviews" className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1380px] px-6 py-16 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl text-ink sm:text-4xl">Hear From Our Customers</h2>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} className="fill-gold text-gold" />
                ))}
              </div>
              <span className="text-sm font-semibold text-ink">4.9</span>
              <span className="text-sm text-ink/60">on Google &middot; 230+ reviews</span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-sm border border-hairline p-6">
              <div className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((__, j) => (
                  <Star key={j} size={14} className="fill-gold text-gold" />
                ))}
              </div>
              <p className="text-sm italic text-ink/50">
                Placeholder — real customer review content goes here before launch.
              </p>
              <p className="text-xs uppercase tracking-wide text-ink/40">Google Review</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
