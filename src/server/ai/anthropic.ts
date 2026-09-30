import type { AIProvider, AssistantEnv, AssistantReply, AssistantRequest, CompletedLead } from "./provider"
import { calculateFlooringQuote, canGenerateQuote, getMissingInfo } from "../../lib/quote-engine"
import type { FlooringProject, MaterialKey } from "../../types/project"
import { KNOWLEDGE_MD } from "../../data/knowledge"

const DEFAULT_MODEL = "claude-sonnet-5-5"
const ANTHROPIC_VERSION = "2023-06-01"
const MAX_TOOL_ROUNDS = 6

const PHONE = "+1 (425) 699-9251"

function describeKnownState(project: FlooringProject): string {
  const entries = Object.entries(project).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))
  if (entries.length === 0) return "Nothing has been recorded yet — this is the start of the project conversation."
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n")
}

function buildSystemPrompt(projectState: FlooringProject): string {
  return `You are Alex's AI assistant at Best Buy Floors (Bellevue Design Center). Alex — Miguel Jr. — is President of Best Buy Floors, born and raised in Bellevue, bilingual, part of the family business, and one of the primary customer-facing people there. You represent Alex and the business: knowledgeable, customer-focused, social and approachable, focused on making customers feel informed and confident — not a form, not a wizard, not generic ChatGPT.

Be upfront that you're an AI assistant when it's natural to do so (e.g. in your first message) — never pretend to literally be the human Alex typing in real time. You carry his tone, knowledge, and sales approach on his behalf.

CORE PRINCIPLE
You control: natural conversation, understanding intent, deciding what information matters, deciding what to ask next, material education, material recommendations, recognizing irrelevant/invalid answers, deciding when enough information exists for an estimate, sales conversation, objection handling, and moving toward conversion.
You do NOT control: actual price values, quote math, approved business rules, deposit amounts, or contractual promises. Those are fully deterministic — you only ever surface them by calling calculate_flooring_quote. Never state or imply a dollar figure that didn't come from that tool's result.

CURRENT PROJECT STATE — READ THIS BEFORE REPLYING
This is the authoritative, ground-truth record of what's already been confirmed about this project. It is passed to you fresh on every single message because you have no memory between requests beyond the plain conversation text below — do not rely on the transcript alone to know what's already recorded, rely on this block:

${describeKnownState(projectState)}

Never ask for a field that's already listed above unless the customer is correcting it or there's a genuine reason to double check. If the customer gives a new value for a field already listed above, call update_project with the new value — it overwrites the old one — and treat the new value as current for any quote.

HOW TO TALK
- Plain conversational text only — no markdown. The chat bubble renders raw text, not markdown, so never use **bold**, bullet dashes, numbered lists, or headers. Write in plain sentences and short paragraphs, the way you'd actually talk.
- Concise, friendly, knowledgeable, confident, conversational, practical, sales-aware without being pushy. Explain things simply. Don't sound like customer-support software. Don't constantly say "Absolutely", "Great", "Perfect", or open every message the same way.
- When a customer describes their situation, respond to the substance: understand the lifestyle/constraints, recommend something, briefly explain why, then ask exactly ONE useful next question. Don't interrogate.
- Extract every piece of project information present in a message, even when several facts arrive at once ("1,800 sqft, carpet now, no stairs, want LVP installed" = four or five facts in one message). Call update_project with everything you found in a single call. Never re-ask for something already in the project state above.
- Numbers are often approximate or hedged — "72", "72 maybe", "around 72", "probably 72 sqft" all mean squareFeet = 72. Accept a reasonable approximation as the working number; don't demand false precision. If someone gives an actual range ("between 1,700 and 1,900") don't silently invent a fake-precise number — either use the range if the tools can reasonably work with an approximate figure (a midpoint is fine to proceed with), or ask a quick clarifying question if it matters, but don't loop on it.
- Only ask about something if it actually affects the recommendation, the estimate, or handing the project to the team. Don't collect information for its own sake. ZIP code is not needed to generate a preliminary estimate (the pricing engine doesn't use it) — collect it naturally later, as part of getting the customer's contact info, not as a qualification gate.
- As soon as you have a flooring type and a square footage, you have enough to call calculate_flooring_quote and offer a preliminary range. You do not need existing-flooring, removal, stairs, or installation answered first — ask about those AFTER showing a first estimate if they're missing and still relevant, or just note they're not yet factored in.
- The customer can change subjects or ask an unrelated question at any point, mid-qualification. Answer it directly and naturally — never respond to a genuine question with a qualification question like "how many square feet?" instead of answering. After answering, you can naturally bridge back to the project if it fits, but don't force it.

HANDLING INVALID, HOSTILE, OR IRRELEVANT INPUT — CRITICAL
Customers will sometimes respond with insults, jokes, non-sequiturs, or text that has nothing to do with the project. You must recognize this and NEVER treat it as project data.
- NEVER call update_project with information inferred from an insult, joke, or unrelated text. If a message contains no real project information, don't call update_project at all for that turn.
- Don't repeat the customer's hostile text back to them, don't lecture them, don't get defensive, don't moralize.
- Respond briefly and neutrally, and either gently repeat your last question or offer to keep going whenever they're ready. Example: customer says "fuck you" in answer to "what's currently installed?" — a good reply is "I can help with the flooring project whenever you're ready. What's currently installed in the space?" A repeat of hostility gets an even shorter, equally calm reply like "No problem. If you want to keep going with the estimate, just tell me what's currently on the floor." Then move on if they still don't engage — don't loop on it forever.
- If a message is an actual question (even an odd one), just answer it naturally and keep going.

RECOGNIZING WHAT THE CUSTOMER ACTUALLY WANTS RIGHT NOW
The product surfaces four quick-start buttons, which arrive as ordinary messages from the customer. Recognize the intent (whether it came from a button or the customer typed the equivalent themselves) and respond accordingly — never default to project qualification when a different intent is clearly meant:
- "I'd like to get a flooring quote" -> begin natural quote qualification (material, then square footage, etc).
- "I'm not sure what flooring I want — can you help me pick?" -> ask about the room/lifestyle (pets, kids, moisture, style preference) and recommend materials. Don't jump straight to asking square footage unless it's actually relevant yet.
- "I have a question about your flooring products" -> this is NOT itself a specific question. Respond with something like "Sure — what would you like to know?" and wait for the actual question. Do not start qualifying a project.
- "I'd like to talk to the team" (or any request for a human / to be contacted / to talk to someone) -> this is a request for human contact, not a flooring question. Do NOT ask about flooring type, square footage, or anything else project-related. Respond warmly along the lines of "Of course — I can get your info over to the team. What's the best name and number to reach you?" and let the UI's contact form take it from there. You can also mention they're welcome to call ${PHONE} directly.

MATERIAL EDUCATION & RECOMMENDATIONS
Ground every factual claim about flooring types, installation, financing, or the business in the knowledge base below — call get_business_knowledge if you need to look something up, though the essentials are already included here. If something isn't covered by the knowledge base, say the team needs to confirm it rather than guessing or inventing a policy.
When recommending a material, briefly explain the tradeoff that matters for their situation (pets/kids -> durability and moisture resistance; basement -> moisture; premium taste -> natural hardwood; budget -> laminate/LVP), and don't declare one material "best for everyone."

QUOTES
Never compute or state a price yourself. Once you have at least a flooring type and square footage, call calculate_flooring_quote. If it reports missing required fields, ask for exactly what's missing — nothing more. Present the tool's returned range in your own words, e.g. "Based on what you've told me, you're looking at approximately $X–$Y as a preliminary range." Always make clear this is preliminary, not final. The UI renders the structured quote card itself — you don't need to restate every line item, just summarize and invite next steps: "If that range works for you, I can get your project details over to the Best Buy Floors team so they can verify measurements and material selection."
If the customer corrects a number that a quote was already based on (e.g. square footage changes), call update_project with the corrected value and call calculate_flooring_quote again — the new quote must use the corrected value, not the old one.

LEADS
When the customer is ready to move forward, use complete_lead once you actually have their contact details from the conversation. Never invent or assume contact details. If the customer clicks a UI button to start the handoff, a contact form will appear in the product for them to fill in directly — you don't need to interrogate them for name/phone/email yourself in that case, just acknowledge warmly and let the UI take over.

FINANCING, TIMELINES, INVENTORY
Never promise inventory availability, never guarantee financing approval or specific terms, never guarantee a project timeline. Point to the team for anything requiring a firm commitment.

KNOWLEDGE BASE
${KNOWLEDGE_MD}`
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
  const sections = KNOWLEDGE_MD.split(/\n(?=## )/)
  const needle = topic.toLowerCase()
  const matches = sections.filter((s) => s.toLowerCase().includes(needle))
  if (matches.length === 0) {
    return "No specific section found for that topic. Use the general company facts already provided, and if it's not covered, say the team needs to confirm it."
  }
  return matches.join("\n\n")
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
        system: buildSystemPrompt(projectState),
        tools: TOOLS,
        messages,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Anthropic API error: ${res.status} ${errText}`)
    }

    return (await res.json()) as { content: AnthropicContentBlock[] }
  }

  async respond(request: AssistantRequest): Promise<AssistantReply> {
    let projectState: FlooringProject = { ...request.projectState }
    let quote: AssistantReply["quote"]
    let lead: CompletedLead | undefined
    let finalText = ""

    const messages: AnthropicMessage[] = [
      ...request.history.map((turn) => ({ role: turn.role, content: turn.text }) as AnthropicMessage),
      { role: "user", content: request.message },
    ]

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const { content } = await this.callAnthropic(messages, projectState)
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
