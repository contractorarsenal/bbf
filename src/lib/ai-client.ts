import type { FlooringProject } from "../types/project"
import type { AssistantReply, HistoryTurn } from "../server/ai/provider"

export type { AssistantReply, HistoryTurn }

/**
 * Talks to the Cloudflare Worker's POST /api/assistant. This is the ONLY way
 * the browser reaches Anthropic — no key ever lives in client code.
 *
 * Throws on network failure (e.g. no Worker present, as with plain `vite dev`
 * run without `wrangler dev`) so the caller can decide whether to fall back
 * to the local deterministic engine for local development. A reply the
 * *server* sends back marked `error: true` is NOT a throw — that's the
 * Worker's controlled fallback message after an Anthropic failure, and it
 * must be shown to the user as-is, never silently replaced.
 */
export async function askAssistant(
  message: string,
  history: HistoryTurn[],
  projectState: FlooringProject,
): Promise<AssistantReply> {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, history, projectState }),
  })

  if (!res.ok) {
    throw new Error(`Assistant request failed: ${res.status}`)
  }

  try {
    return (await res.json()) as AssistantReply
  } catch {
    // Plain `vite dev` with no Worker present can return the SPA's index.html
    // with a 200 status for an unknown route — treat that the same as a
    // network failure so the caller's dev-only fallback still kicks in.
    throw new Error("Assistant response was not valid JSON (no Worker running?)")
  }
}
