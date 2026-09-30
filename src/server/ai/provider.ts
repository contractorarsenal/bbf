import type { FlooringProject, QuoteResult } from "../../types/project"

/**
 * Server-side provider contract. This module (and everything it imports from
 * ./demo and ./anthropic) is only ever meant to run inside the Cloudflare
 * Worker (worker.ts) — never in the browser bundle.
 *
 * Request path once Anthropic is enabled:
 *   Browser -> Cloudflare Worker (this module) -> Anthropic API
 * Never:
 *   Browser -> Anthropic API directly
 */

export interface AssistantEnv {
  AI_PROVIDER?: "demo" | "anthropic"
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_MODEL?: string
}

export interface HistoryTurn {
  role: "assistant" | "user"
  text: string
}

export interface AssistantRequest {
  message: string
  history: HistoryTurn[]
  projectState: FlooringProject
}

export interface CompletedLead {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  zipCode?: string
  address?: string
  preferredContactMethod?: string
  projectSummary?: string
}

export interface AssistantReply {
  reply: string
  projectState: FlooringProject
  quote?: QuoteResult
  lead?: CompletedLead
  /** true when `reply` is the controlled fallback message because the
   * upstream provider (e.g. Anthropic) failed — never silently swapped for
   * the scripted demo engine in that case. */
  error?: boolean
}

export interface AIProvider {
  respond(request: AssistantRequest): Promise<AssistantReply>
}

/**
 * Selects a provider based on server-side env bindings.
 * AI_PROVIDER=anthropic + a configured key -> real Claude conversation.
 * Anything else -> the deterministic demo engine (dev-only fallback; see
 * README for why this is intentionally not used as the primary experience).
 */
export async function getProvider(env: AssistantEnv): Promise<AIProvider> {
  if (env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import("./anthropic")
    return new AnthropicProvider(env)
  }
  const { DemoProvider } = await import("./demo")
  return new DemoProvider()
}
