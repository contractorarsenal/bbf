import { getProvider } from "../../src/server/ai/provider"
import type { AssistantEnv, AssistantRequest } from "../../src/server/ai/provider"

/**
 * Cloudflare Pages Function: POST /api/assistant
 *
 * Not called by the current demo frontend (it runs the deterministic engine
 * directly in-browser). This exists so the production integration can point
 * the chat UI at this endpoint instead, without changing the provider logic:
 * set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY in the Cloudflare project's
 * environment variables (never in client code) to switch it on.
 */
export const onRequestPost: PagesFunction<AssistantEnv> = async (context) => {
  let body: AssistantRequest
  try {
    body = await context.request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 })
  }

  if (!body?.message || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "`message` is required" }), { status: 400 })
  }

  const provider = await getProvider(context.env)
  const result = await provider.respond({
    message: body.message,
    history: body.history ?? [],
    projectState: body.projectState ?? {},
  })

  return new Response(JSON.stringify(result), {
    headers: { "content-type": "application/json" },
  })
}
