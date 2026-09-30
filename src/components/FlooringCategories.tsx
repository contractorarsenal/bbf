import { ArrowRight } from "lucide-react"

interface Category {
  name: string
  image: string
}

const CATEGORIES: Category[] = [
  { name: "Carpet Flooring", image: "/images/cat-carpet.webp" },
  { name: "Tile Flooring", image: "/images/cat-tile.webp" },
  { name: "Vinyl Flooring", image: "/images/cat-vinyl.webp" },
  { name: "Hardwood Flooring", image: "/images/cat-hardwood.webp" },
  { name: "Luxury Vinyl Flooring", image: "/images/cat-lvp.webp" },
  { name: "Laminate Flooring", image: "/images/cat-laminate.webp" },
  { name: "Cork Flooring", image: "/images/cat-cork.webp" },
  { name: "Bamboo Flooring", image: "/images/cat-bamboo.webp" },
  { name: "Rubber Flooring", image: "/images/cat-rubber.webp" },
  { name: "Waterproof Flooring", image: "/images/cat-waterproof.webp" },
]

export function FlooringCategories() {
  return (
    <section id="flooring" className="border-b border-hairline bg-paper-warm">
      <div className="mx-auto max-w-[1400px] px-6 py-16 text-center lg:px-10 lg:py-20">
        <h2 className="font-display text-3xl text-ink sm:text-4xl lg:text-[42px]">Start With The Right Flooring</h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-ink/70">
          Browse our collection of flooring categories to compare materials, explore styles, and
          find the best fit for your home or business.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-6 text-left sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((cat) => (
            <a key={cat.name} href="#flooring" className="group block">
              <div className="aspect-square w-full overflow-hidden rounded-sm bg-paper">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-base font-medium text-ink">{cat.name}</h3>
                <ArrowRight size={16} className="shrink-0 text-gold-dark transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
