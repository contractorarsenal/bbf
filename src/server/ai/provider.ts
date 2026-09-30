import type { FlooringProject, QuoteResult } from "../../types/project"

/**
 * Server-side provider contract. This module (and everything it imports from
 * ./demo and ./anthropic) is only ever meant to run inside a Cloudflare Worker
 * / Pages Function — never in the browser bundle. The demo itself never calls
 * this: it runs src/lib/conversation-engine.ts directly, client-side, so the
 * product works with zero backend and zero API key.
 *
 * Intended request path once Anthropic is enabled:
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

export interface AssistantReply {
  reply: string
  projectState: FlooringProject
  quote?: QuoteResult
}

export interface AIProvider {
  respond(request: AssistantRequest): Promise<AssistantReply>
}

/**
 * Selects a provider based on server-side env bindings.
 * Falls back to demo mode automatically whenever ANTHROPIC_API_KEY is missing
 * or AI_PROVIDER isn't explicitly "anthropic" — the app must never break
 * because a key wasn't configured.
 */
export async function getProvider(env: AssistantEnv): Promise<AIProvider> {
  if (env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import("./anthropic")
    return new AnthropicProvider(env)
  }
  const { DemoProvider } = await import("./demo")
  return new DemoProvider()
}
