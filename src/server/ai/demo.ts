import type { AIProvider, AssistantReply, AssistantRequest } from "./provider"
import { createInitialContext, handleUserMessage } from "../../lib/conversation-engine"

/**
 * Server-side mirror of the deterministic demo engine. This is the fallback
 * path — selected by getProvider() ONLY when AI_PROVIDER is explicitly
 * "demo" (a local dev convenience). Everything else resolves to
 * AnthropicProvider; see README for why this scripted engine is
 * intentionally not the production experience.
 */
export class DemoProvider implements AIProvider {
  async respond(request: AssistantRequest): Promise<AssistantReply> {
    const context = { ...createInitialContext(), project: request.projectState }
    const { messages, context: nextContext } = handleUserMessage(context, request.message)
    const reply = messages
      .map((m) => m.text)
      .filter((t): t is string => Boolean(t))
      .join("\n\n")

    return {
      reply: reply || "Could you tell me a bit more about the project?",
      projectState: nextContext.project,
      quote: messages.find((m) => m.quote)?.quote,
    }
  }
}
