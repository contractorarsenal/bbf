import type { AIProvider, AssistantReply, AssistantRequest } from "./provider"
import { createInitialContext, handleUserMessage } from "../../lib/conversation-engine"

/**
 * Server-side mirror of the deterministic demo engine. Not called by the
 * current frontend (which runs conversation-engine.ts directly in-browser),
 * but keeps the Worker entry point functional if a future client calls it
 * over HTTP instead of running the engine locally.
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
