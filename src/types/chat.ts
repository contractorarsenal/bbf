import type { FlooringProject, Lead, QuoteResult } from "./project"

export type MessageRole = "assistant" | "user" | "system"

export interface ChatAction {
  id: string
  label: string
}

export interface PhotoAttachment {
  id: string
  name: string
  url: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  text?: string
  createdAt: number
  actions?: ChatAction[]
  quote?: QuoteResult
  leadForm?: boolean
  leadSuccess?: boolean
  photoNotice?: PhotoAttachment[]
  typing?: boolean
}

export type ConversationStage =
  | "welcome"
  | "discovery"
  | "qualifying"
  | "quote_ready"
  | "closing"
  | "lead_captured"

export interface ConversationContext {
  stage: ConversationStage
  project: FlooringProject
  lead: Partial<Lead>
  askedQuestions: Set<string>
  pendingField?: keyof FlooringProject
  mode?: "quote" | "help_pick" | "qa"
  lastQuote?: QuoteResult
}

export interface EngineResponse {
  messages: Array<Omit<ChatMessage, "id" | "createdAt">>
  context: ConversationContext
}
