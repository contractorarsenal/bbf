import type { AIProvider, AssistantEnv, AssistantReply, AssistantRequest } from "./provider"
import { calculateFlooringQuote, canGenerateQuote } from "../../lib/quote-engine"
import type { FlooringProject } from "../../types/project"

const DEFAULT_MODEL = "claude-sonnet-5-5"
const ANTHROPIC_VERSION = "2023-06-01"

const SYSTEM_PROMPT = `You are the Best Buy Floors AI Project Assistant.

Your job is to answer flooring and material questions, help customers choose
products, qualify projects, create preliminary estimates using the approved
quote engine, and move qualified customers toward speaking with the Best Buy
Floors team.

Never invent prices. Never calculate project pricing yourself — always call
calculate_flooring_quote and relay its result. Never promise inventory. Never
guarantee financing. Never guarantee project timelines. Never represent a
preliminary estimate as a final quote.

Ask one useful question at a time. Use the supplied Best Buy Floors knowledge
base for business-specific information. If information is unknown, say the
team needs to confirm it.`

/**
 * update_project_state / calculate_flooring_quote / complete_lead are exposed
 * as tools so the model can request structured actions, but pricing math
 * always happens in quote-engine.ts (calculate_flooring_quote below), never
 * inside the model's own output.
 */
const TOOLS = [
  {
    name: "update_project_state",
    description: "Record known facts about the customer's flooring project.",
    input_schema: {
      type: "object",
      properties: {
        flooringType: { type: "string" },
        squareFeet: { type: "number" },
        existingFlooring: { type: "string" },
        removalRequired: { type: "boolean" },
        stairs: { type: "number" },
        pets: { type: "boolean" },
        children: { type: "boolean" },
        moistureConcern: { type: "boolean" },
        waterproofRequired: { type: "boolean" },
        zipCode: { type: "string" },
        installationRequired: { type: "boolean" },
      },
    },
  },
  {
    name: "calculate_flooring_quote",
    description: "Calculate a preliminary estimate range using the approved demo pricing engine. Never compute this yourself.",
    input_schema: { type: "object", properties: {} },
  },
] as const

export class AnthropicProvider implements AIProvider {
  private env: AssistantEnv

  constructor(env: AssistantEnv) {
    this.env = env
  }

  async respond(request: AssistantRequest): Promise<AssistantReply> {
    const apiKey = this.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("AnthropicProvider requires ANTHROPIC_API_KEY to be set server-side.")
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: [
          ...request.history.map((turn) => ({
            role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: turn.text,
          })),
          { role: "user" as const, content: request.message },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>
    }

    let projectState: FlooringProject = request.projectState
    let quote: AssistantReply["quote"]
    let reply = ""

    for (const block of data.content) {
      if (block.type === "text" && block.text) {
        reply += block.text
      }
      if (block.type === "tool_use" && block.name === "update_project_state" && block.input) {
        projectState = { ...projectState, ...(block.input as Partial<FlooringProject>) }
      }
      if (block.type === "tool_use" && block.name === "calculate_flooring_quote" && canGenerateQuote(projectState)) {
        quote = calculateFlooringQuote(projectState)
      }
    }

    return { reply: reply || "Could you tell me a bit more about the project?", projectState, quote }
  }
}
