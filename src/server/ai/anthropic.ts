import type { AIProvider, AssistantEnv, AssistantReply, AssistantRequest, CompletedLead, HistoryTurn } from "./provider"
import { calculateFlooringQuote, canGenerateQuote, getMissingInfo } from "../../lib/quote-engine"
import type { FlooringProject, MaterialKey } from "../../types/project"
import { KNOWLEDGE_SECTIONS, selectKnowledgeSections } from "../../data/knowledge"

const DEFAULT_MODEL = "claude-sonnet-5-5"
const ANTHROPIC_VERSION = "2023-06-01"
const MAX_TOOL_ROUNDS = 6
/** Messages (not exchanges) of prior conversation sent per request — see
 * "CONVERSATION WINDOW" in the token-efficiency pass. FlooringProject state,
 * not history, is the authoritative record, so a short window is safe. */
const HISTORY_WINDOW = 10

const PHONE = "+1 (425) 699-9251"

function describeKnownState(project: FlooringProject): string {
  const entries = Object.entries(project).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))
  if (entries.length === 0) return "(nothing recorded yet)"
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")
}

function buildSystemPrompt(projectState: FlooringProject, knowledgeText: string): string {
  return `You are Alex's virtual assistant at Best Buy Floors (Bellevue Design Center). Alex/Miguel Jr. is President, born and raised in Bellevue, bilingual, part of the family business. You carry his tone and sales approach: knowledgeable, warm, concise — not a form, not generic ChatGPT. The interface already discloses you're a virtual assistant, so don't re-announce that in your replies — just talk naturally.

CONTROL: you handle conversation, recommendations, and qualification. You NEVER state a price yourself — only calculate_flooring_quote produces numbers.

PROJECT STATE (authoritative, fresh every message — don't rely on transcript alone): ${describeKnownState(projectState)}
Never re-ask for something already listed. A new value for a listed field is a correction — call update_project, it overwrites.

STYLE: 2-4 short sentences by default. Direct answer first. Plain text, no markdown/bullets. Vary phrasing, skip "Absolutely/Great/Perfect" openers. Ask at most ONE follow-up question, only if it actually affects the recommendation/estimate/handoff. When calculate_flooring_quote returns a result, don't restate the line items (the UI shows a breakdown card) — just state the range in one line and ask the one most useful next thing. Longer, detailed answers are fine when the customer explicitly asks for detail. No emoji unless the customer uses one first.

FACTS: extract every fact in a message at once (material, sqft, removal, stairs, etc. can all be in one update_project call). Hedged/approximate numbers ("72 maybe", "around 72") mean that number — don't demand false precision. A real range ("between 1700-1900") can use a reasonable midpoint rather than looping for exact precision.

INVALID/HOSTILE INPUT: never call update_project from an insult, joke, or unrelated text. Don't repeat it back, lecture, or get defensive — answer briefly and neutrally, e.g. "I can help with the flooring project whenever you're ready. What's currently installed?" and move on.

TANGENTS: a genuine off-topic or product question mid-qualification gets answered directly and briefly, never deflected with a qualification question. Trivial off-topic asks (e.g. "what's 2+2") get one short line plus an offer to help with flooring — not a paragraph.

INTENTS: "get a flooring quote" -> qualify (material, sqft, etc). "help me pick flooring" -> ask lifestyle/room, recommend, don't jump to sqft. "question about your products" -> that's not itself a question, ask "what would you like to know?". "talk to the team" -> human handoff, never ask project questions, say something like "Of course — I can get your info over to the team, what's the best name and number?" (mention ${PHONE} too) and let the UI form take over.

QUOTES: once material + sqft are known, call calculate_flooring_quote. If it reports missing fields, ask only for those. State the range as preliminary, never final. A square-footage or material correction after a quote means: update_project, then calculate_flooring_quote again with the new value.

LEADS: use complete_lead only with contact info the customer actually gave; the UI's own form usually handles this, so just acknowledge warmly.

Never guarantee inventory, financing terms, or timelines — point to the team. If something isn't in the knowledge below, say the team needs to confirm it; call get_business_knowledge for anything not covered here.

KNOWLEDGE
${knowledgeText}`
}

const TOOLS = [
  {
    name: "update_project",
    description:
      "Record known facts about the customer's flooring project, extracted ONLY from things they actually said or clearly confirmed. Pass just the fields you're confident about — never infer values from jokes, insults, or unrelated text. Partial updates are fine; omit anything not yet known.",
    input_schema: {
      type: "object",
      properties: {
        flooringType: { type: "string", enum: ["lvp", "carpet", "engineeredHardwood", "solidHardwood", "tile", "laminate"] },
        squareFeet: { type: "number" },
        existingFlooring: { type: "string" },
        removalRequired: { type: "boolean" },
        stairs: { type: "number" },
        installationRequired: { type: "boolean" },
        zipCode: { type: "string" },
        rooms: { type: "array", items: { type: "string" } },
        pets: { type: "boolean" },
        children: { type: "boolean" },
        moistureConcern: { type: "boolean" },
        waterproofRequired: { type: "boolean" },
        budget: { type: "string", enum: ["value", "mid", "premium", "unspecified"] },
        timeline: { type: "string", enum: ["asap", "few_weeks", "few_months", "just_exploring", "unspecified"] },
        materialPreference: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "calculate_flooring_quote",
    description:
      "Calculate a preliminary estimate range using the approved deterministic pricing engine, based on project details already recorded via update_project. Never compute pricing yourself — always call this. Returns an error listing missing fields if there isn't enough information yet.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_business_knowledge",
    description: "Look up Best Buy Floors business information (services, locations, financing, installation, etc.) by topic/keyword.",
    input_schema: {
      type: "object",
      properties: { topic: { type: "string", description: "Keyword or topic, e.g. 'financing', 'basement', 'installation'." } },
      required: ["topic"],
    },
  },
  {
    name: "complete_lead",
    description: "Record a customer's contact details once they've actually provided them and are ready for the team to follow up.",
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        zipCode: { type: "string" },
        address: { type: "string" },
        preferredContactMethod: { type: "string" },
        projectSummary: { type: "string" },
      },
      required: ["firstName", "lastName", "phone", "email"],
    },
  },
] as const

const MATERIAL_KEYS: MaterialKey[] = ["lvp", "carpet", "engineeredHardwood", "solidHardwood", "tile", "laminate"]
const BUDGET_VALUES = ["value", "mid", "premium", "unspecified"]
const TIMELINE_VALUES = ["asap", "few_weeks", "few_months", "just_exploring", "unspecified"]

/** Narrows an arbitrary tool-call input down to well-typed FlooringProject fields, dropping anything malformed. */
function sanitizeProjectUpdate(input: unknown): Partial<FlooringProject> {
  if (!input || typeof input !== "object") return {}
  const raw = input as Record<string, unknown>
  const out: Partial<FlooringProject> = {}

  if (typeof raw.flooringType === "string" && MATERIAL_KEYS.includes(raw.flooringType as MaterialKey)) {
    out.flooringType = raw.flooringType as MaterialKey
  }
  if (typeof raw.squareFeet === "number" && raw.squareFeet > 0 && raw.squareFeet < 100000) {
    out.squareFeet = raw.squareFeet
  }
  if (typeof raw.existingFlooring === "string" && raw.existingFlooring.length < 100) {
    out.existingFlooring = raw.existingFlooring
  }
  if (typeof raw.removalRequired === "boolean") out.removalRequired = raw.removalRequired
  if (typeof raw.stairs === "number" && raw.stairs >= 0 && raw.stairs < 200) out.stairs = raw.stairs
  if (typeof raw.installationRequired === "boolean") out.installationRequired = raw.installationRequired
  if (typeof raw.zipCode === "string" && /^\d{5}$/.test(raw.zipCode)) out.zipCode = raw.zipCode
  if (Array.isArray(raw.rooms) && raw.rooms.every((r) => typeof r === "string")) out.rooms = raw.rooms as string[]
  if (typeof raw.pets === "boolean") out.pets = raw.pets
  if (typeof raw.children === "boolean") out.children = raw.children
  if (typeof raw.moistureConcern === "boolean") out.moistureConcern = raw.moistureConcern
  if (typeof raw.waterproofRequired === "boolean") out.waterproofRequired = raw.waterproofRequired
  if (typeof raw.budget === "string" && BUDGET_VALUES.includes(raw.budget)) {
    out.budget = raw.budget as FlooringProject["budget"]
  }
  if (typeof raw.timeline === "string" && TIMELINE_VALUES.includes(raw.timeline)) {
    out.timeline = raw.timeline as FlooringProject["timeline"]
  }
  if (typeof raw.materialPreference === "string" && raw.materialPreference.length < 200) {
    out.materialPreference = raw.materialPreference
  }
  return out
}

function sanitizeLead(input: unknown): CompletedLead | undefined {
  if (!input || typeof input !== "object") return undefined
  const raw = input as Record<string, unknown>
  if (typeof raw.firstName !== "string" || typeof raw.lastName !== "string") return undefined
  if (typeof raw.phone !== "string" || typeof raw.email !== "string") return undefined
  const lead: CompletedLead = {
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    email: raw.email,
  }
  if (typeof raw.zipCode === "string") lead.zipCode = raw.zipCode
  if (typeof raw.address === "string") lead.address = raw.address
  if (typeof raw.preferredContactMethod === "string") lead.preferredContactMethod = raw.preferredContactMethod
  if (typeof raw.projectSummary === "string") lead.projectSummary = raw.projectSummary
  return lead
}

function searchKnowledge(topic: string): string {
  const needle = topic.toLowerCase()
  const matches = Object.entries(KNOWLEDGE_SECTIONS).filter(
    ([key, text]) => key.includes(needle) || text.toLowerCase().includes(needle),
  )
  if (matches.length === 0) {
    return "No specific section found for that topic. Say the team needs to confirm it rather than guessing."
  }
  return matches.map(([, text]) => text).join("\n\n")
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string }

interface AnthropicMessage {
  role: "user" | "assistant"
  content: string | AnthropicContentBlock[]
}

export class AnthropicProvider implements AIProvider {
  private env: AssistantEnv

  constructor(env: AssistantEnv) {
    this.env = env
  }

  private async callAnthropic(
    messages: AnthropicMessage[],
    projectState: FlooringProject,
    knowledgeText: string,
  ): Promise<{ content: AnthropicContentBlock[] }> {
    const apiKey = this.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")

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
        system: buildSystemPrompt(projectState, knowledgeText),
        tools: TOOLS,
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Anthropic API error: ${res.status} ${errText}`)
    }

    const data = (await res.json()) as { content: AnthropicContentBlock[]; usage?: { input_tokens: number; output_tokens: number } }
    if (this.env.TOKEN_QA) {
      // eslint-disable-next-line no-console
      console.log(
        `[TOKEN_QA] input_tokens=${data.usage?.input_tokens} output_tokens=${data.usage?.output_tokens} historyMessages=${messages.length}`,
      )
    }
    return data
  }

  async respond(request: AssistantRequest): Promise<AssistantReply> {
    let projectState: FlooringProject = { ...request.projectState }
    let quote: AssistantReply["quote"]
    let lead: CompletedLead | undefined
    let finalText = ""

    // Conversation window: FlooringProject state (above) is the authoritative
    // record of project facts, so we don't need unlimited history for
    // correctness — only enough for natural continuity on tangents.
    const windowedHistory: HistoryTurn[] = request.history.slice(-HISTORY_WINDOW)
    const recentText = windowedHistory.map((t) => t.text).join(" ")
    const { text: knowledgeText, topics } = selectKnowledgeSections(request.message, recentText)

    if (this.env.TOKEN_QA) {
      // eslint-disable-next-line no-console
      console.log(`[TOKEN_QA] knowledgeTopics=[${topics.join(",")}] historyWindowSize=${windowedHistory.length}/${request.history.length}`)
    }

    const messages: AnthropicMessage[] = [
      ...windowedHistory.map((turn) => ({ role: turn.role, content: turn.text }) as AnthropicMessage),
      { role: "user", content: request.message },
    ]

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const { content } = await this.callAnthropic(messages, projectState, knowledgeText)
      messages.push({ role: "assistant", content })

      const toolUses = content.filter((b): b is Extract<AnthropicContentBlock, { type: "tool_use" }> => b.type === "tool_use")
      const textBlocks = content.filter((b): b is Extract<AnthropicContentBlock, { type: "text" }> => b.type === "text")
      if (textBlocks.length > 0) finalText = textBlocks.map((b) => b.text).join("\n")

      if (toolUses.length === 0) break

      const toolResults: AnthropicContentBlock[] = []
      for (const tu of toolUses) {
        let resultContent: string

        if (tu.name === "update_project") {
          projectState = { ...projectState, ...sanitizeProjectUpdate(tu.input) }
          resultContent = JSON.stringify({ ok: true, projectState })
        } else if (tu.name === "calculate_flooring_quote") {
          if (!canGenerateQuote(projectState)) {
            resultContent = JSON.stringify({ ok: false, missing: getMissingInfo(projectState) })
          } else {
            quote = calculateFlooringQuote(projectState)
            resultContent = JSON.stringify({ ok: true, quote })
          }
        } else if (tu.name === "get_business_knowledge") {
          const topic = typeof (tu.input as Record<string, unknown>)?.topic === "string" ? (tu.input as { topic: string }).topic : ""
          resultContent = searchKnowledge(topic)
        } else if (tu.name === "complete_lead") {
          const sanitized = sanitizeLead(tu.input)
          if (sanitized) {
            lead = sanitized
            resultContent = JSON.stringify({ ok: true })
          } else {
            resultContent = JSON.stringify({ ok: false, error: "Missing required contact fields." })
          }
        } else {
          resultContent = JSON.stringify({ ok: false, error: `Unknown tool: ${tu.name}` })
        }

        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: resultContent })
      }
      messages.push({ role: "user", content: toolResults })
    }

    return {
      reply: finalText || "Could you tell me a bit more about the project?",
      projectState,
      quote,
      lead,
    }
  }
}
