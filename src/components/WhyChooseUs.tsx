import { Award, Home, LayoutGrid, Star, Users } from "lucide-react"

const POINTS = [
  { icon: Users, label: "Family Owned Since 1990" },
  { icon: Home, label: "10,000+ Projects Completed" },
  { icon: Star, label: "230+ 5-Star Reviews" },
  { icon: LayoutGrid, label: "Two Luxury Showrooms" },
  { icon: Award, label: "Flooring, Cabinets, Countertops & More" },
]

export function WhyChooseUs() {
  return (
    <section className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1380px] px-6 py-16 lg:py-20">
        <h2 className="max-w-2xl font-display text-3xl text-ink sm:text-4xl">
          Why Homeowners Choose Best Buy Floors
        </h2>
        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {POINTS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex flex-col items-start gap-3 rounded-sm border border-hairline p-6"
            >
              <Icon size={22} className="text-gold-dark" aria-hidden="true" />
              <span className="text-sm font-medium leading-snug text-ink">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
