/**
 * Business knowledge, split into topic sections so only relevant ones are
 * sent to Anthropic per turn (see selectKnowledgeSections below) instead of
 * injecting the entire knowledge base into every request. Kept in sync with
 * knowledge.md by hand. Intentionally does NOT invent policies, pricing,
 * hours, brand partnerships, or guarantees that weren't supplied — where
 * something isn't known, say the team needs to confirm it.
 */

/** Always included — small, foundational identity + process facts. */
export const GENERAL_SECTION = `Best Buy Floors facts: Bellevue Design Center by Best Buy Floors, family owned since 1990, flooring/cabinets/countertops/wallpaper, two showrooms, serves Bellevue/Redmond/Seattle/Kirkland/Renton/Sammamish and nearby WA. Phone +1 (425) 699-9251. Google rating 4.9 from 230+ reviews. 10,000+ projects completed. A preliminary estimate is never a final quote — final pricing needs exact measurements, product selection, subfloor/site conditions, and team review. Never invent prices outside the quote tool. Anything beyond these facts (exact addresses, hours, staff names, specific brand lineup, financing terms, warranty language) isn't in this knowledge base — say the team needs to confirm it.`

export const KNOWLEDGE_SECTIONS: Record<string, string> = {
  locations: `Two showroom locations serving Bellevue, Redmond, Seattle, Kirkland, Renton, Sammamish, and nearby Washington communities. Exact addresses aren't in this knowledge base — say the team needs to confirm which showroom is closest.`,

  hours: `Showroom hours aren't in this knowledge base — say the team needs to confirm current hours.`,

  services: `Best Buy Floors offers flooring, cabinets, countertops, and wallpaper — a one-stop showroom for coordinating a whole home, plus professional installation.`,

  installation: `Professional installation is offered as part of a flooring project. Existing flooring can be removed and hauled away when requested. Stairs are priced and scoped separately from flat square footage since they need more labor per unit. Subfloor condition can affect scope/pricing — the team confirms this during measurement/site review, not in the initial conversation.`,

  financing: `Best Buy Floors offers financing options, including promotional 0% APR offers mentioned on the website. Specific terms, qualification requirements, and current promotions aren't in this knowledge base — don't quote financing terms you aren't certain of, point to the team.`,

  brands: `Specific brand/manufacturer partnerships aren't in this knowledge base — say the team can go over current brand options.`,

  carpet: `Carpet: best for bedrooms, media rooms, and spaces where softness/sound dampening matter. Wide range of piles, fibers, price points. Stains/wears faster in high-traffic areas; less ideal for pets prone to accidents or moisture-prone spaces.`,

  lvp: `LVP (Luxury Vinyl Plank): waterproof or highly water-resistant core, realistic wood/stone-look visuals, durable and low-maintenance. Common pick for households with pets/kids or below-grade spaces like basements. Generally more affordable than solid hardwood while still looking premium.`,

  vinyl: `Vinyl/LVP: waterproof or highly water-resistant core options, realistic wood- and stone-look visuals, durable and low-maintenance — a common recommendation for pets/kids or basements.`,

  hardwood: `Hardwood (solid and engineered): premium, natural, adds long-term home value. Solid hardwood can be sanded/refinished multiple times. Engineered hardwood has a real wood wear layer over a stable core, more dimensionally stable in humidity than solid. Neither is recommended for consistently wet areas without the team evaluating a waterproof underlayment strategy. More susceptible to scratching (pets) and water damage than LVP or tile.`,

  tile: `Tile: extremely durable and water resistant, common in bathrooms/kitchens/entryways/mudrooms. Cold underfoot without radiant heat; grout lines need maintenance. Wide design range including natural stone looks.`,

  laminate: `Laminate: photographic wear layer over composite core, budget-friendly alternative to hardwood visuals. Less water tolerant than LVP; not typically recommended for wet areas.`,

  waterproof: `Waterproof flooring generally means LVP/rigid-core vinyl and tile. Prioritized for basements, bathrooms, entryways, and homes with pets or young kids where moisture/spills are a regular concern.`,

  kitchens: `Best Buy Floors' scope extends into cabinets and countertops for kitchen remodeling alongside flooring.`,

  bathrooms: `For bathrooms, tile and waterproof resilient flooring are the most common recommendations given moisture exposure.`,

  countertops: `Countertops are part of Best Buy Floors' offering alongside flooring and cabinets. Specific materials/pricing aren't in this knowledge base — the team can go over options.`,

  cabinets: `Cabinets are part of Best Buy Floors' offering alongside flooring and countertops. Specific lines/pricing aren't in this knowledge base — the team can go over options.`,
}

/** Used when a message is clearly about materials/recommendations but no single material keyword matched. */
const MATERIALS_OVERVIEW = `Quick material overview: LVP is durable, waterproof/water-resistant, low-maintenance, good for pets/kids/basements. Carpet is soft/quiet but wears faster and isn't ideal for pets or moisture. Tile is very durable and water resistant, cold underfoot, good for wet areas. Hardwood (solid/engineered) is premium and natural but more sensitive to scratches/water. Laminate is a budget wood-look option, less water tolerant than LVP.`

const TOPIC_PATTERNS: Array<[RegExp, string]> = [
  [/\blocation|\bshowroom|\bwhere are you|\baddress|\bnear me\b/i, "locations"],
  [/\bhours?\b|\bwhat time\b|\bopen (today|now)\b/i, "hours"],
  [/\bservices?\b|\bwhat do you (offer|do)\b|\bremodel/i, "services"],
  [/\binstall/i, "installation"],
  [/\bfinanc|\bapr\b|\bloan\b|\bpayment plan\b|\bcredit\b/i, "financing"],
  [/\bbrand(s)?\b|\bmanufacturer/i, "brands"],
  [/\bcarpet(ing)?\b/i, "carpet"],
  [/\blvp\b|\bluxury vinyl\b/i, "lvp"],
  [/\bvinyl\b/i, "vinyl"],
  [/\bhardwood\b|\bengineered wood\b|\bsolid wood\b/i, "hardwood"],
  [/\btile\b|\bporcelain\b|\bceramic\b/i, "tile"],
  [/\blaminate\b/i, "laminate"],
  [/\bwaterproof\b|\bwater.resistant\b|\bmoistur|\bbasement\b/i, "waterproof"],
  [/\bkitchen\b/i, "kitchens"],
  [/\bbathroom\b|\bbath\b/i, "bathrooms"],
  [/\bcountertop|\bcounter top/i, "countertops"],
  [/\bcabinet/i, "cabinets"],
]

const GENERIC_MATERIAL_QUESTION = /\bmaterial\b|\bwhich (one|type|flooring)\b|\bbest for\b|\bholds? up\b|\bdurable\b|\brecommend/i

/**
 * Deterministic topic selector — no vector DB, just keyword matching against
 * the current message (recent history included for a little extra recall).
 * Always includes GENERAL_SECTION; adds matched topic sections; falls back
 * to a compact materials overview for clearly-material-related but
 * unspecific questions; otherwise general alone is enough.
 */
export function selectKnowledgeSections(message: string, recentText = ""): { text: string; topics: string[] } {
  const haystack = `${message} ${recentText}`
  const matched = new Set<string>()
  for (const [pattern, topic] of TOPIC_PATTERNS) {
    if (pattern.test(haystack)) matched.add(topic)
  }

  const sections = [GENERAL_SECTION]
  const topics: string[] = []
  for (const topic of matched) {
    sections.push(KNOWLEDGE_SECTIONS[topic])
    topics.push(topic)
  }

  if (matched.size === 0 && GENERIC_MATERIAL_QUESTION.test(message)) {
    sections.push(MATERIALS_OVERVIEW)
    topics.push("materials_overview")
  }

  return { text: sections.join("\n\n"), topics }
}
