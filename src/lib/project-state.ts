import type { FlooringProject } from "../types/project"
import type { Lead } from "../types/project"

const LEADS_KEY = "bbf-demo-leads"

/** Shallow-merges new facts into project state without clobbering existing known values with undefined. */
export function mergeProjectState(
  current: FlooringProject,
  updates: Partial<FlooringProject>,
): FlooringProject {
  const next: FlooringProject = { ...current }
  for (const key of Object.keys(updates) as Array<keyof FlooringProject>) {
    const value = updates[key]
    if (value === undefined) continue
    // @ts-expect-error -- generic merge across a heterogeneous key set
    next[key] = value
  }
  return next
}

/** Persists a completed demo lead to localStorage and logs a CRM-shaped payload to the console. */
export function saveDemoLead(lead: Lead): void {
  try {
    const existing = loadDemoLeads()
    const updated = [...existing, lead]
    window.localStorage.setItem(LEADS_KEY, JSON.stringify(updated))
  } catch {
    // Storage may be unavailable (private browsing, quota) — demo should not break.
  }

  // eslint-disable-next-line no-console
  console.info("[Best Buy Floors demo] Lead ready for CRM handoff:", lead)
}

export function loadDemoLeads(): Lead[] {
  try {
    const raw = window.localStorage.getItem(LEADS_KEY)
    return raw ? (JSON.parse(raw) as Lead[]) : []
  } catch {
    return []
  }
}
