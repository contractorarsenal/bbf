import type { FlooringProject, MaterialKey } from "../types/project"
import type { ChatMessage, ConversationContext, EngineResponse, PhotoAttachment } from "../types/chat"
import { calculateFlooringQuote, canGenerateQuote } from "./quote-engine"
import { mergeProjectState, saveDemoLead } from "./project-state"

/**
 * Deterministic, keyword-driven "conversation engine" used when DEMO_MODE is on
 * (i.e. no Anthropic API key configured). It recognizes enough natural phrasing
 * to convincingly demo qualification → estimate → lead capture without an LLM.
 * See src/server/ai/provider.ts for how this is swapped for a real model later.
 */

type Stub = Omit<ChatMessage, "id" | "createdAt">

const PHONE = "+1 (425) 699-9251"

const MATERIAL_LABELS: Record<MaterialKey, string> = {
  lvp: "Luxury Vinyl Plank",
  carpet: "Carpet",
  engineeredHardwood: "Engineered Hardwood",
  solidHardwood: "Solid Hardwood",
  tile: "Tile",
  laminate: "Laminate",
}

const MATERIAL_PATTERNS: Array<[RegExp, MaterialKey]> = [
  [/luxury vinyl plank|luxury vinyl|\blvp\b/i, "lvp"],
  [/solid hardwood|solid wood floor/i, "solidHardwood"],
  [/engineered hardwood|engineered wood/i, "engineeredHardwood"],
  [/\bhardwood\b|wood look|wood floor/i, "engineeredHardwood"],
  [/\btile\b|porcelain|ceramic/i, "tile"],
  [/laminate/i, "laminate"],
  [/vinyl plank|vinyl floor|\bvinyl\b/i, "lvp"],
  [/\bcarpet\b|carpeting/i, "carpet"],
]

export function createInitialContext(): ConversationContext {
  return {
    stage: "welcome",
    project: {},
    lead: {},
    askedQuestions: new Set<string>(),
  }
}

function withContext(context: ConversationContext, updates: Partial<ConversationContext>): ConversationContext {
  return { ...context, ...updates }
}

function askedOnce(context: ConversationContext, field: keyof FlooringProject): boolean {
  return context.askedQuestions.has(field)
}

function markAsked(context: ConversationContext, field: keyof FlooringProject): ConversationContext {
  const next = new Set(context.askedQuestions)
  next.add(field)
  return withContext(context, { askedQuestions: next, pendingField: field })
}

// ---------------------------------------------------------------------------
// Fact extraction
// ---------------------------------------------------------------------------

function extractNumber(text: string): number | undefined {
  const withUnit = text.match(/(\d{1,3}(?:,\d{3})*|\d{2,6})\s*(?:sq\.?\s*ft\.?|square\s*feet|sqft|sf)\b/i)
  if (withUnit) return parseInt(withUnit[1].replace(/,/g, ""), 10)
  return undefined
}

function extractBareNumber(text: string): number | undefined {
  const match = text.match(/(\d{1,3}(?:,\d{3})+|\d{1,6})/)
  if (!match) return undefined
  return parseInt(match[1].replace(/,/g, ""), 10)
}

function extractMaterial(text: string): MaterialKey | undefined {
  for (const [pattern, key] of MATERIAL_PATTERNS) {
    if (pattern.test(text)) return key
  }
  return undefined
}

function detectYesNo(text: string): boolean | undefined {
  if (/\b(yes|yeah|yep|sure|please|correct|that'?s right|go ahead)\b/i.test(text)) return true
  if (/\b(no|nope|nah|not yet|don'?t need|already (removed|gone))\b/i.test(text)) return false
  return undefined
}

interface ExtractedFacts {
  updates: Partial<FlooringProject>
  notes: string[]
}

function extractFacts(text: string, project: FlooringProject, pendingField?: keyof FlooringProject): ExtractedFacts {
  const updates: Partial<FlooringProject> = {}
  const notes: string[] = []

  const material = extractMaterial(text)
  if (
    material &&
    pendingField !== "existingFlooring" &&
    material !== project.flooringType &&
    !isComparisonQuestion(text)
  ) {
    updates.flooringType = material
    notes.push(`material:${material}`)
  }

  const sqft = extractNumber(text) ?? (pendingField === "squareFeet" ? extractBareNumber(text) : undefined)
  if (sqft && sqft > 0 && sqft < 50000) {
    updates.squareFeet = sqft
    notes.push("sqft")
  }

  const stairsMatch = text.match(/(\d{1,3})\s*stairs?\b/i)
  if (stairsMatch) {
    updates.stairs = parseInt(stairsMatch[1], 10)
    notes.push("stairs")
  } else if (pendingField === "stairs") {
    if (/\b(no|none|zero|n\/a|not applicable)\b/i.test(text)) {
      updates.stairs = 0
      notes.push("stairs")
    } else {
      const bare = extractBareNumber(text)
      if (bare !== undefined && bare < 100) {
        updates.stairs = bare
        notes.push("stairs")
      }
    }
  }

  if (/\b(dog|dogs|cat|cats|\bpets?\b)\b/i.test(text)) {
    updates.pets = true
    notes.push("pets")
  }
  if (/\b(kids?|children|toddler|toddlers)\b/i.test(text)) {
    updates.children = true
    notes.push("children")
  }

  if (/waterproof/i.test(text)) {
    updates.waterproofRequired = true
    notes.push("waterproof")
  }
  if (/basement|crawl\s*space/i.test(text)) {
    updates.moistureConcern = true
    notes.push("basement")
  }
  if (/moist(ure)?|damp|humid|flood(ing)?/i.test(text)) {
    updates.moistureConcern = true
    notes.push("moisture")
  }

  if (/\bcheap|inexpensive|budget[- ]friendly|low[- ]cost|affordable\b/i.test(text)) {
    updates.budget = "value"
    notes.push("budget")
  } else if (/\bpremium|high[- ]end|luxury|top[- ]of[- ]the[- ]line\b/i.test(text)) {
    updates.budget = "premium"
    notes.push("budget")
  } else if (/\bmid[- ]range|moderate|middle of the road\b/i.test(text)) {
    updates.budget = "mid"
    notes.push("budget")
  }

  if (/\basap|right away|as soon as possible\b/i.test(text)) {
    updates.timeline = "asap"
    notes.push("timeline")
  } else if (/few weeks|couple weeks|this month/i.test(text)) {
    updates.timeline = "few_weeks"
    notes.push("timeline")
  } else if (/few months|later this year|not in a rush/i.test(text)) {
    updates.timeline = "few_months"
    notes.push("timeline")
  } else if (/just (looking|exploring|browsing)|not sure when/i.test(text)) {
    updates.timeline = "just_exploring"
    notes.push("timeline")
  }

  // Existing flooring / removal
  const existingMatch = text.match(
    /(?:currently have|right now (?:i|we) have|existing flooring is|we have|i have)\s+([a-z ]+?)(?:\.|,|$)/i,
  )
  const bareNone = /\b(bare subfloor|no flooring|nothing down|new construction|subfloor only)\b/i.test(text)
  if (bareNone) {
    updates.existingFlooring = "bare subfloor"
    updates.removalRequired = false
    notes.push("existingFlooring")
  } else if (existingMatch && extractMaterial(existingMatch[1])) {
    updates.existingFlooring = existingMatch[1].trim()
    notes.push("existingFlooring")
  } else if (pendingField === "existingFlooring") {
    const mat = extractMaterial(text)
    if (mat) {
      updates.existingFlooring = MATERIAL_LABELS[mat]
      notes.push("existingFlooring")
    } else {
      const cleaned = text.trim()
      if (cleaned.length > 0 && cleaned.length < 60) {
        updates.existingFlooring = cleaned
        notes.push("existingFlooring")
      }
    }
  }

  if (/\b(remove|removal|rip(ping)? out|tear(ing)? out|haul away|needs? to go|pull up)\b/i.test(text)) {
    updates.removalRequired = true
    notes.push("removal")
  } else if (pendingField === "removalRequired") {
    const yn = detectYesNo(text)
    if (yn !== undefined) {
      updates.removalRequired = yn
      notes.push("removal")
    }
  }

  if (pendingField === "installationRequired") {
    const yn = detectYesNo(text)
    if (yn !== undefined) {
      updates.installationRequired = yn
      notes.push("installation")
    } else if (/material[- ]only|diy|myself|just (the )?material/i.test(text)) {
      updates.installationRequired = false
      notes.push("installation")
    }
  } else if (/professional install|install it for (me|us)|you guys install it/i.test(text)) {
    updates.installationRequired = true
    notes.push("installation")
  }

  const zipMatch = text.match(/\b(\d{5})\b/)
  if (zipMatch && (pendingField === "zipCode" || /zip/i.test(text))) {
    updates.zipCode = zipMatch[1]
    notes.push("zip")
  }

  if (pendingField === "rooms") {
    const cleaned = text.trim()
    if (cleaned.length > 0) {
      updates.rooms = [cleaned]
      notes.push("rooms")
    }
  }

  return { updates, notes }
}

// ---------------------------------------------------------------------------
// Intent detection (for free-form Q&A that doesn't need to block qualification)
// ---------------------------------------------------------------------------

function isInstallQuestion(text: string): boolean {
  return /do (you|ya'?ll|you guys) (also )?(do |offer )?install|do you install|does .*include installation|can you install/i.test(
    text,
  )
}

function isDontKnowIntent(text: string): boolean {
  return /i don'?t know|not sure what|no idea what|not sure which/i.test(text)
}

function findComparisonMaterials(text: string): MaterialKey[] {
  const found = new Set<MaterialKey>()
  for (const [pattern, key] of MATERIAL_PATTERNS) {
    if (pattern.test(text)) found.add(key)
  }
  return Array.from(found)
}

function isComparisonQuestion(text: string): boolean {
  const hasCompareWord = /what'?s better|which is better|compare|\bvs\.?\b|\bversus\b|or (carpet|tile|lvp|vinyl|hardwood|laminate)/i.test(
    text,
  )
  return hasCompareWord && findComparisonMaterials(text).length >= 2
}

function isBasementQuestion(text: string): boolean {
  return /basement/i.test(text) && /\?|best|good|recommend|what should/i.test(text)
}

// ---------------------------------------------------------------------------
// Knowledge answers
// ---------------------------------------------------------------------------

const MATERIAL_BLURB: Record<MaterialKey, string> = {
  lvp: "Luxury Vinyl Plank is waterproof or highly water-resistant, durable, and low-maintenance, with realistic wood- and stone-look options",
  carpet: "Carpet adds softness and sound dampening but shows wear and stains more easily, especially with pets",
  engineeredHardwood:
    "Engineered Hardwood gives a premium natural look and is more dimensionally stable than solid hardwood, but it's still more sensitive to scratches and water than LVP",
  solidHardwood:
    "Solid Hardwood is a premium, natural material that can be refinished multiple times, but it's the most sensitive to moisture and scratching",
  tile: "Tile is extremely durable and water resistant, a strong fit for bathrooms, kitchens, and entryways",
  laminate: "Laminate is a budget-friendly alternative to hardwood visuals, but it's less water tolerant than LVP",
}

function answerComparison(materials: MaterialKey[], project: FlooringProject): string {
  const [a, b] = materials
  const petsOrKids = project.pets || project.children
  let lead = `${MATERIAL_BLURB[a]}. ${MATERIAL_BLURB[b]}.`
  if (petsOrKids && (materials.includes("lvp") || materials.includes("engineeredHardwood") || materials.includes("solidHardwood"))) {
    lead +=
      " With pets or kids in the house, a lot of homeowners lean toward LVP for the wood look with easier day-to-day maintenance — but hardwood is still a great choice if you're comfortable with a bit more upkeep."
  }
  return lead
}

function answerBasementQuestion(): string {
  return "For a basement, moisture is the main thing to plan around. Waterproof LVP and tile are usually the safest bets — both hold up well against dampness. Carpet and hardwood are riskier down there unless the space is well controlled for moisture."
}

function answerInstallQuestion(): string {
  return "Yes — professional installation is part of what we offer. If you'd like, I can also include installation in a preliminary project estimate."
}

// ---------------------------------------------------------------------------
// Recommendation logic
// ---------------------------------------------------------------------------

function recommendMaterial(project: FlooringProject): { material: MaterialKey; reasoning: string } {
  if (project.moistureConcern || project.waterproofRequired) {
    return {
      material: "lvp",
      reasoning:
        "since moisture is a factor, waterproof LVP is the safer bet — it holds up against dampness far better than hardwood, carpet, or laminate",
    }
  }
  if (project.pets && project.children) {
    return {
      material: "lvp",
      reasoning:
        "with both pets and kids in the house, LVP gives you a wood-look floor that's a lot easier to keep clean and more resistant to scratches and spills than hardwood or carpet",
    }
  }
  if (project.pets) {
    return {
      material: "lvp",
      reasoning: "with pets around, LVP resists scratches and moisture much better than hardwood or carpet while still giving a wood look",
    }
  }
  if (project.budget === "premium") {
    return {
      material: "engineeredHardwood",
      reasoning: "for a premium, natural look, engineered hardwood is a strong choice and adds long-term home value",
    }
  }
  if (project.budget === "value") {
    return {
      material: "laminate",
      reasoning: "for a budget-friendly option that still gives a wood-look floor, laminate is worth a look",
    }
  }
  return {
    material: "lvp",
    reasoning: "LVP is a popular starting point for most homes — durable, low-maintenance, and available in a wide range of looks",
  }
}

// ---------------------------------------------------------------------------
// Question sequencing
// ---------------------------------------------------------------------------

interface NextQuestion {
  field: keyof FlooringProject
  prompt: string
}

function nextQuestion(project: FlooringProject, context: ConversationContext): NextQuestion | null {
  if (!project.flooringType && !askedOnce(context, "flooringType")) {
    return { field: "flooringType", prompt: "What type of flooring are you looking for, or what result are you hoping for?" }
  }
  if (!project.squareFeet && !askedOnce(context, "squareFeet")) {
    return { field: "squareFeet", prompt: "About how many square feet are we working with?" }
  }
  if (!project.existingFlooring && !askedOnce(context, "existingFlooring")) {
    return { field: "existingFlooring", prompt: "What's currently installed in that space?" }
  }
  const hasRealExisting = project.existingFlooring && project.existingFlooring !== "bare subfloor"
  if (hasRealExisting && project.removalRequired === undefined && !askedOnce(context, "removalRequired")) {
    return {
      field: "removalRequired",
      prompt: `Should we include removal and haul-away of the existing ${project.existingFlooring} in the estimate?`,
    }
  }
  if (project.stairs === undefined && !askedOnce(context, "stairs")) {
    return { field: "stairs", prompt: "Are there any stairs included in the project?" }
  }
  if (project.installationRequired === undefined && !askedOnce(context, "installationRequired")) {
    return {
      field: "installationRequired",
      prompt: "Would you like professional installation included, or is this material only?",
    }
  }
  if (!project.zipCode && !askedOnce(context, "zipCode")) {
    return { field: "zipCode", prompt: "What's the project ZIP code?" }
  }
  return null
}

function askQuestion(context: ConversationContext, q: NextQuestion): { message: Stub; context: ConversationContext } {
  return {
    message: { role: "assistant", text: q.prompt },
    context: markAsked(context, q.field),
  }
}

function buildQuoteMessages(project: FlooringProject): Stub[] {
  const quote = calculateFlooringQuote(project)
  const messages: Stub[] = [
    {
      role: "assistant",
      text: "Here's a preliminary range based on what you've shared so far.",
      quote,
    },
  ]
  if (!project.photos || project.photos.length === 0) {
    messages.push({
      role: "assistant",
      text: "If you have a few photos of the space, you can upload them here too — they help our team understand the project before final measurement.",
    })
  }
  return messages
}

// ---------------------------------------------------------------------------
// Acknowledgment phrasing (kept varied/short per style guidance)
// ---------------------------------------------------------------------------

const ACK_PHRASES = ["Got it.", "Noted.", "Okay.", "Good to know.", "That helps."]
let ackIndex = 0
function nextAck(): string {
  const phrase = ACK_PHRASES[ackIndex % ACK_PHRASES.length]
  ackIndex += 1
  return phrase
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export function handleWelcome(context: ConversationContext): EngineResponse {
  const message: Stub = {
    role: "assistant",
    text: "Hi! I'm the Best Buy Floors Project Assistant. I can help you compare flooring, answer product questions, or put together an estimated project range. What are you working on?",
    actions: [
      { id: "action:get-quote", label: "Get a Flooring Quote" },
      { id: "action:help-pick", label: "Help Me Pick Flooring" },
      { id: "action:ask-question", label: "Ask a Product Question" },
      { id: "action:talk-team", label: "Talk to the Team" },
    ],
  }
  return { messages: [message], context: withContext(context, { stage: "discovery" }) }
}

export function handleAction(context: ConversationContext, actionId: string): EngineResponse {
  switch (actionId) {
    case "action:get-quote": {
      const q = nextQuestion(context.project, context)
      const messages: Stub[] = [{ role: "assistant", text: "Sure — let's put together a project range." }]
      let next = withContext(context, { stage: "qualifying", mode: "quote" })
      if (q) {
        const asked = askQuestion(next, q)
        messages.push(asked.message)
        next = asked.context
      }
      return { messages, context: next }
    }
    case "action:help-pick": {
      const next = markAsked(withContext(context, { stage: "qualifying", mode: "help_pick" }), "rooms")
      return {
        messages: [{ role: "assistant", text: "Happy to help narrow it down. What room or area are we talking about?" }],
        context: next,
      }
    }
    case "action:ask-question": {
      return {
        messages: [{ role: "assistant", text: "Sure — what would you like to know about flooring, materials, or our services?" }],
        context: withContext(context, { stage: "discovery", mode: "qa" }),
      }
    }
    case "action:talk-team": {
      return {
        messages: [
          {
            role: "assistant",
            text: `You can reach our team directly at ${PHONE}. If it's easier, I can also grab a few details here and have someone follow up with you.`,
            actions: [{ id: "action:ready-to-move-forward", label: "Have the Team Reach Out" }],
          },
        ],
        context: withContext(context, { stage: "discovery" }),
      }
    }
    case "action:ready-to-move-forward": {
      const messages: Stub[] = [
        {
          role: "assistant",
          text: "Great — I'll get a few details so the Best Buy Floors team can review the project and finalize your measurements, materials, and pricing.",
        },
        { role: "assistant", leadForm: true },
      ]
      return { messages, context: withContext(context, { stage: "closing" }) }
    }
    case "action:adjust-project": {
      return {
        messages: [{ role: "assistant", text: "No problem — what would you like to change? Material, square footage, or something else?" }],
        context: withContext(context, { stage: "qualifying", mode: "quote" }),
      }
    }
    default:
      return { messages: [], context }
  }
}

export function handleUserMessage(context: ConversationContext, rawText: string): EngineResponse {
  const text = rawText.trim()
  if (text.length === 0) return { messages: [], context }

  const { updates, notes } = extractFacts(text, context.project, context.pendingField)
  const project = mergeProjectState(context.project, updates)
  let working = withContext(context, { project, pendingField: undefined })

  const messages: Stub[] = []

  // Direct-answer intents that don't require blocking on qualification.
  if (isComparisonQuestion(text)) {
    const materials = findComparisonMaterials(text)
    messages.push({ role: "assistant", text: answerComparison(materials, project) })
    messages.push({
      role: "assistant",
      text: "If you'd like, I can also help narrow down what would work best for your home.",
      actions: [{ id: "action:get-quote", label: "Get a Flooring Quote" }],
    })
    return { messages, context: working }
  }

  if (isBasementQuestion(text)) {
    messages.push({ role: "assistant", text: answerBasementQuestion() })
    messages.push({
      role: "assistant",
      text: "If you know roughly how much space you're working with, I can also put together a preliminary project range.",
      actions: [{ id: "action:get-quote", label: "Get a Flooring Quote" }],
    })
    return { messages, context: working }
  }

  if (isInstallQuestion(text)) {
    messages.push({ role: "assistant", text: answerInstallQuestion() })
    if (!canGenerateQuote(project)) {
      messages.push({
        role: "assistant",
        text: "If you know roughly how much space you're replacing, I can also put together a preliminary project range.",
        actions: [{ id: "action:get-quote", label: "Get a Flooring Quote" }],
      })
    }
    return { messages, context: working }
  }

  if (isDontKnowIntent(text) && !project.flooringType) {
    working = withContext(markAsked(working, "rooms"), { mode: "help_pick" })
    messages.push({ role: "assistant", text: "No problem — that's what I'm here for. What room or area are we talking about?" })
    return { messages, context: working }
  }

  // Help-me-pick flow: once we have room + at least one signal, recommend.
  if (working.mode === "help_pick" && !project.flooringType) {
    const hasSignal = project.pets !== undefined || project.children !== undefined || project.budget !== undefined || project.moistureConcern
    if (project.rooms && project.rooms.length > 0 && !hasSignal && !askedOnce(working, "pets")) {
      working = markAsked(working, "pets")
      messages.push({ role: "assistant", text: "Any pets or kids in the home, or concerns like moisture in that space?" })
      return { messages, context: working }
    }
    const { material, reasoning } = recommendMaterial(project)
    messages.push({
      role: "assistant",
      text: `Based on what you've shared, ${MATERIAL_LABELS[material]} is worth a close look — ${reasoning}.`,
      actions: [{ id: "action:get-quote", label: `Get a ${MATERIAL_LABELS[material]} Quote` }],
    })
    // Pre-fill the recommendation so the quote flow doesn't re-ask it if they proceed.
    working = withContext(working, { mode: "quote", project: mergeProjectState(project, { flooringType: material }) })
    return { messages, context: working }
  }

  // Otherwise, acknowledge new facts (if any) and continue qualification.
  const justChoseHardwoodLook = updates.flooringType === "engineeredHardwood" || updates.flooringType === "solidHardwood"
  const hasPetsOrKids = project.pets || project.children
  if (justChoseHardwoodLook && hasPetsOrKids && !askedOnce(working, "materialPreference")) {
    working = markAsked(working, "materialPreference")
    messages.push({
      role: "assistant",
      text: `Worth flagging before we go further: with pets and kids in the house, a lot of homeowners lean toward LVP over hardwood for the easier day-to-day maintenance and better scratch/moisture resistance — while still getting a wood look. Hardwood is still a great choice if you're comfortable with a bit more upkeep.`,
    })
  } else if (notes.length > 0 && working.stage !== "welcome") {
    messages.push({ role: "assistant", text: nextAck() })
  }

  const q = working.stage === "quote_ready" ? null : nextQuestion(project, working)
  if (q) {
    const asked = askQuestion(working, q)
    messages.push(asked.message)
    working = withContext(asked.context, { stage: "qualifying" })
  } else if (canGenerateQuote(project) && working.stage !== "quote_ready") {
    messages.push(...buildQuoteMessages(project))
    working = withContext(working, { stage: "quote_ready", lastQuote: calculateFlooringQuote(project) })
  } else if (messages.length === 0) {
    messages.push({
      role: "assistant",
      text: "Tell me a bit about the project — the flooring you have in mind, the space, or any questions you have — and I'll take it from there.",
    })
  }

  return { messages, context: working }
}

export function handleReadyToMoveForward(context: ConversationContext): EngineResponse {
  return handleAction(context, "action:ready-to-move-forward")
}

export function handlePhotosAdded(context: ConversationContext, photos: PhotoAttachment[]): EngineResponse {
  const project = mergeProjectState(context.project, {
    photos: [...(context.project.photos ?? []), ...photos.map((p) => p.url)],
  })
  const working = withContext(context, { project })
  return {
    messages: [
      { role: "user", photoNotice: photos },
      { role: "assistant", text: "Thanks — I've added those photos to your project." },
    ],
    context: working,
  }
}

export interface LeadFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  zipCode?: string
  address?: string
  preferredContact?: "phone" | "email" | "text"
}

export function handleLeadSubmit(context: ConversationContext, form: LeadFormData): EngineResponse {
  const project = context.project
  const quote = context.lastQuote ?? (canGenerateQuote(project) ? calculateFlooringQuote(project) : undefined)

  const lead = {
    ...form,
    zipCode: form.zipCode ?? project.zipCode,
    project,
    quote,
    createdAt: new Date().toISOString(),
  }
  saveDemoLead(lead)

  const message: Stub = { role: "assistant", leadSuccess: true }
  return {
    messages: [message],
    context: withContext(context, { stage: "lead_captured", lead }),
  }
}
