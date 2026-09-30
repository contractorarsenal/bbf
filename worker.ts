import { getProvider } from "./src/server/ai/provider"
import type { AssistantEnv, AssistantReply, AssistantRequest } from "./src/server/ai/provider"

/**
 * Cloudflare Worker entry point (Workers + Static Assets model): serves the
 * built SPA from ./dist via the ASSETS binding, and handles POST /api/assistant.
 *
 * The chat UI calls this endpoint for every turn. getProvider() picks the
 * Anthropic provider when AI_PROVIDER=anthropic and a key is configured, or
 * falls back to the deterministic demo engine only when it isn't (local dev
 * without secrets configured). When the Anthropic provider IS selected and
 * its call fails, that failure is caught here and turned into a controlled
 * error reply — it is never silently swapped for the scripted demo engine.
 */
interface Env extends AssistantEnv {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const FALLBACK_ERROR_MESSAGE =
  "I'm having trouble connecting right now. You can still call the Best Buy Floors team at +1 (425) 699-9251."

async function handleAssistant(request: Request, env: Env): Promise<Response> {
  let body: AssistantRequest
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  if (!body?.message || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "`message` is required" }), { status: 400 })
  }

  const usingAnthropic = env.AI_PROVIDER === "anthropic" && Boolean(env.ANTHROPIC_API_KEY)
  const provider = await getProvider(env)

  let result: AssistantReply
  try {
    result = await provider.respond({
      message: body.message,
      history: body.history ?? [],
      projectState: body.projectState ?? {},
    })
  } catch (err) {
    if (!usingAnthropic) throw err
    // eslint-disable-next-line no-console
    console.error("[assistant] Anthropic provider failed:", err instanceof Error ? err.message : err)
    result = {
      reply: FALLBACK_ERROR_MESSAGE,
      projectState: body.projectState ?? {},
      error: true,
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === "/api/assistant" && request.method === "POST") {
      return handleAssistant(request, env)
    }
    return env.ASSETS.fetch(request)
  },
}
