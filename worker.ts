import { getProvider } from "./src/server/ai/provider"
import type { AssistantEnv, AssistantRequest } from "./src/server/ai/provider"

/**
 * Cloudflare Worker entry point (Workers + Static Assets model): serves the
 * built SPA from ./dist via the ASSETS binding, and handles POST /api/assistant.
 *
 * Not called by the current demo frontend (it runs the deterministic engine
 * directly in-browser). This exists so the production integration can point
 * the chat UI at this endpoint instead, without changing the provider logic:
 * set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY in the Cloudflare project's
 * environment variables (never in client code) to switch it on.
 */
interface Env extends AssistantEnv {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

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

  const provider = await getProvider(env)
  const result = await provider.respond({
    message: body.message,
    history: body.history ?? [],
    projectState: body.projectState ?? {},
  })

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
