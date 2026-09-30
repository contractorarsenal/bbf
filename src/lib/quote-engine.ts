import pricing from "../data/pricing.json"
import type { FlooringProject, MaterialKey, QuoteLineItem, QuoteResult } from "../types/project"

/**
 * The quote engine is the ONLY place estimate math happens.
 * The conversation/AI layer gathers inputs but never invents prices.
 * All numbers below trace back to src/data/pricing.json (DEMO PRICING).
 */

const MATERIAL_LABELS: Record<MaterialKey, string> = {
  lvp: "Luxury Vinyl Plank",
  carpet: "Carpet",
  engineeredHardwood: "Engineered Hardwood",
  solidHardwood: "Solid Hardwood",
  tile: "Tile",
  laminate: "Laminate",
}

function round(n: number): number {
  return Math.round(n)
}

/** Returns which fields are still needed for a confident estimate. */
export function getMissingInfo(project: FlooringProject): string[] {
  const missing: string[] = []
  if (!project.flooringType) missing.push("flooringType")
  if (!project.squareFeet) missing.push("squareFeet")
  return missing
}

/** True once we have the minimum inputs required to produce a preliminary range. */
export function canGenerateQuote(project: FlooringProject): boolean {
  return getMissingInfo(project).length === 0
}

export function calculateFlooringQuote(project: FlooringProject): QuoteResult {
  const missingInfo = getMissingInfo(project)
  const items: QuoteLineItem[] = []
  const assumptions: string[] = []
  let low = 0
  let high = 0

  const material = project.flooringType
  const sqft = project.squareFeet ?? 0

  if (material && sqft > 0) {
    const materialRate = pricing.materials[material]
    const laborRate = pricing.labor[material]
    const materialLow = materialRate.low * sqft
    const materialHigh = materialRate.high * sqft
    const laborLow = laborRate.low * sqft
    const laborHigh = laborRate.high * sqft

    items.push({
      label: MATERIAL_LABELS[material],
      detail: `${sqft.toLocaleString()} sq ft material`,
      low: round(materialLow),
      high: round(materialHigh),
    })
    items.push({
      label: "Professional Installation",
      detail: `${sqft.toLocaleString()} sq ft labor`,
      low: round(laborLow),
      high: round(laborHigh),
    })
    low += materialLow + laborLow
    high += materialHigh + laborHigh
  } else {
    assumptions.push("Material and square footage are required for a priced estimate.")
  }

  if (project.removalRequired && sqft > 0) {
    const isCarpetRemoval = project.existingFlooring?.toLowerCase().includes("carpet")
    const removalRate = isCarpetRemoval ? pricing.removal.carpet : pricing.removal.hardSurface
    const removalLow = removalRate.low * sqft
    const removalHigh = removalRate.high * sqft
    items.push({
      label: "Removal & Haul-Away",
      detail: isCarpetRemoval ? "Existing carpet removal" : "Existing hard surface removal",
      low: round(removalLow),
      high: round(removalHigh),
    })
    low += removalLow
    high += removalHigh
  } else if (project.existingFlooring && project.removalRequired === undefined) {
    assumptions.push("Removal of existing flooring not yet confirmed — not included in this range.")
  }

  if (project.stairs && project.stairs > 0) {
    const stairsLow = pricing.stairs.low * project.stairs
    const stairsHigh = pricing.stairs.high * project.stairs
    items.push({
      label: "Stairs",
      detail: `${project.stairs} stair${project.stairs === 1 ? "" : "s"}`,
      low: round(stairsLow),
      high: round(stairsHigh),
    })
    low += stairsLow
    high += stairsHigh
  }

  if (!project.zipCode) {
    assumptions.push("Project location not yet provided — final pricing may vary by area.")
  }
  if (!project.photos || project.photos.length === 0) {
    assumptions.push("No photos provided — final pricing subject to an in-person or photo review.")
  }

  return {
    low: round(low),
    high: round(high),
    items,
    assumptions,
    missingInfo,
    disclaimer:
      "This is a preliminary estimate based on the information you've provided. Final pricing is subject to exact measurements, product selection, subfloor and site conditions, and project review by the Best Buy Floors team.",
    demo: true,
  }
}
