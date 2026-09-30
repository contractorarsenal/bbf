/** Flooring material keys recognized by the pricing engine and conversation engine. */
export type MaterialKey =
  | "lvp"
  | "carpet"
  | "engineeredHardwood"
  | "solidHardwood"
  | "tile"
  | "laminate"

export type BudgetTier = "value" | "mid" | "premium" | "unspecified"

export type Timeline = "asap" | "few_weeks" | "few_months" | "just_exploring" | "unspecified"

export type ContactMethod = "phone" | "email" | "text"

/** Progressive record of everything the assistant has learned about a project. */
export interface FlooringProject {
  flooringType?: MaterialKey
  materialPreference?: string
  squareFeet?: number
  rooms?: string[]
  existingFlooring?: string
  removalRequired?: boolean
  stairs?: number
  pets?: boolean
  children?: boolean
  moistureConcern?: boolean
  waterproofRequired?: boolean
  budget?: BudgetTier
  timeline?: Timeline
  zipCode?: string
  photos?: string[]
  installationRequired?: boolean
}

export interface QuoteLineItem {
  label: string
  detail: string
  low: number
  high: number
}

export interface QuoteResult {
  low: number
  high: number
  items: QuoteLineItem[]
  assumptions: string[]
  missingInfo: string[]
  disclaimer: string
  demo: true
}

export interface Lead {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  zipCode?: string
  address?: string
  preferredContact?: ContactMethod
  project: FlooringProject
  quote?: QuoteResult
  createdAt: string
}
