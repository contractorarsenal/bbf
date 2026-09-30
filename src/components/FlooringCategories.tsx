interface Category {
  name: string
  blurb: string
  gradient: string
}

const CATEGORIES: Category[] = [
  { name: "Carpet Flooring", blurb: "Soft, quiet, and budget-flexible", gradient: "linear-gradient(160deg,#e8e0cf,#c9b78f)" },
  { name: "Tile Flooring", blurb: "Durable and water resistant", gradient: "linear-gradient(160deg,#e6e6e2,#b9b4a8)" },
  { name: "Vinyl Flooring", blurb: "Resilient, everyday-friendly", gradient: "linear-gradient(160deg,#e9ddc4,#c7a869)" },
  { name: "Hardwood Flooring", blurb: "Timeless, natural warmth", gradient: "linear-gradient(160deg,#dcc192,#9c6b35)" },
  { name: "Luxury Vinyl Flooring", blurb: "Waterproof wood & stone looks", gradient: "linear-gradient(160deg,#e2ceab,#a97a0f)" },
  { name: "Laminate Flooring", blurb: "Wood looks, budget-friendly", gradient: "linear-gradient(160deg,#ded2b4,#b39a68)" },
  { name: "Cork Flooring", blurb: "Cushioned and sustainable", gradient: "linear-gradient(160deg,#dcb98f,#a9743f)" },
  { name: "Bamboo Flooring", blurb: "Eco-friendly hardwood alternative", gradient: "linear-gradient(160deg,#e3d8ac,#bfa35e)" },
  { name: "Rubber Flooring", blurb: "Tough, slip-resistant surfaces", gradient: "linear-gradient(160deg,#cfc9c2,#716b64)" },
  { name: "Waterproof Flooring", blurb: "Built for moisture-prone spaces", gradient: "linear-gradient(160deg,#d7e3e2,#7ea0a0)" },
]

export function FlooringCategories() {
  return (
    <section id="flooring" className="border-b border-hairline bg-paper-warm">
      <div className="mx-auto max-w-[1380px] px-6 py-16 lg:py-20">
        <h2 className="max-w-2xl font-display text-3xl text-ink sm:text-4xl">Start With The Right Flooring</h2>
        <p className="mt-3 max-w-xl text-ink/70">
          Explore the categories we carry, or let our AI Project Assistant help you narrow it down.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.name}
              className="group overflow-hidden rounded-sm border border-hairline bg-paper transition-shadow hover:shadow-md"
            >
              <div
                className="aspect-[4/3] w-full"
                style={{ background: cat.gradient }}
                role="img"
                aria-label={cat.name}
              />
              <div className="p-4">
                <h3 className="text-sm font-semibold text-ink">{cat.name}</h3>
                <p className="mt-1 text-xs text-ink/60">{cat.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
