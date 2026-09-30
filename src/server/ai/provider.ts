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
  /** Dev-only: when set, logs token/context diagnostics server-side. Never
   * read from `process.env` inside provider code — Workers don't have that
   * global; it's threaded through as an env binding instead. Never exposed
   * to the client. */
  TOKEN_QA?: string
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
 * Selects a provider based on server-side env bindings. Fails closed:
 * the deterministic demo engine ONLY runs when AI_PROVIDER is explicitly
 * "demo" (a local dev convenience — see README). Everything else, including
 * AI_PROVIDER=anthropic with no key configured, resolves to AnthropicProvider,
 * which throws if the key is missing; worker.ts turns that into the controlled
 * "assistant unavailable" error response. Production must never silently
 * drop into the scripted engine just because a secret wasn't set.
 */
export async function getProvider(env: AssistantEnv): Promise<AIProvider> {
  if (env.AI_PROVIDER === "demo") {
    const { DemoProvider } = await import("./demo")
    return new DemoProvider()
  }
  const { AnthropicProvider } = await import("./anthropic")
  return new AnthropicProvider(env)
}
