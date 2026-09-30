import { useEffect, useRef, useState } from "react"
import type { ChatAction, ChatMessage, ConversationContext, PhotoAttachment } from "../../types/chat"
import type { FlooringProject } from "../../types/project"
import { askAssistant } from "../../lib/ai-client"
import type { AssistantReply, HistoryTurn } from "../../lib/ai-client"
import { createInitialContext, handleUserMessage } from "../../lib/conversation-engine"
import type { LeadFormData } from "../../lib/conversation-engine"
import { mergeProjectState, saveDemoLead } from "../../lib/project-state"
import { ChatHeader } from "./ChatHeader"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"
import { Composer } from "./Composer"
import { EXAMPLE_PROMPTS } from "../../data/demoConversations"

type Stub = Omit<ChatMessage, "id" | "createdAt">

function toMessage(stub: Stub): ChatMessage {
  return { ...stub, id: crypto.randomUUID(), createdAt: Date.now() }
}

const WELCOME_TEXT =
  "Hi! I'm the Best Buy Floors Project Assistant. I can help you compare flooring, answer product questions, or put together an estimated project range. What are you working on?"

const QUICK_ACTIONS: Array<{ id: string; label: string; prompt: string }> = [
  { id: "quote", label: "Get a Flooring Quote", prompt: "I'd like to get a flooring quote." },
  { id: "pick", label: "Help Me Pick Flooring", prompt: "I'm not sure what flooring I want — can you help me pick?" },
  { id: "question", label: "Ask a Product Question", prompt: "I have a question about your flooring products." },
  { id: "team", label: "Talk to the Team", prompt: "I'd like to talk to the team." },
]

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    toMessage({ role: "assistant", text: WELCOME_TEXT, actions: QUICK_ACTIONS.map(({ id, label }) => ({ id, label })) }),
  ])
  const [typing, setTyping] = useState(false)
  const [placeholder] = useState(() => EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Source of truth for the live conversation, sent on every turn.
  const historyRef = useRef<HistoryTurn[]>([])
  const projectStateRef = useRef<FlooringProject>({})
  // Only ever touched if /api/assistant is unreachable (e.g. plain `vite dev`
  // with no Worker running) — a dev convenience, never the primary path.
  const localFallbackContextRef = useRef<ConversationContext | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing])

  function runLocalFallback(userText: string): AssistantReply {
    if (!localFallbackContextRef.current) {
      localFallbackContextRef.current = { ...createInitialContext(), project: projectStateRef.current }
    } else {
      localFallbackContextRef.current = { ...localFallbackContextRef.current, project: projectStateRef.current }
    }
    const { messages: stubs, context } = handleUserMessage(localFallbackContextRef.current, userText)
    localFallbackContextRef.current = context
    const replyText = stubs.map((m) => m.text).filter((t): t is string => Boolean(t)).join("\n\n")
    return {
      reply: replyText || "Could you tell me a bit more about the project?",
      projectState: context.project,
      quote: stubs.find((m) => m.quote)?.quote,
    }
  }

  async function sendToAssistant(userText: string): Promise<AssistantReply> {
    try {
      return await askAssistant(userText, historyRef.current, projectStateRef.current)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[assistant] /api/assistant unreachable — using local demo engine (dev fallback only).", err)
      return runLocalFallback(userText)
    }
  }

  /** Sends `sendText` to the assistant, showing `displayText` as the user's bubble. */
  async function handleUserTurn(displayText: string, sendText: string = displayText, thenShowLeadForm = false) {
    setMessages((prev) => [...prev, toMessage({ role: "user", text: displayText })])
    setTyping(true)

    const reply = await sendToAssistant(sendText)

    projectStateRef.current = reply.projectState
    historyRef.current = [...historyRef.current, { role: "user", text: sendText }, { role: "assistant", text: reply.reply }]

    setTyping(false)
    setMessages((prev) => [
      ...prev,
      toMessage({ role: "assistant", text: reply.reply, quote: reply.quote }),
      ...(thenShowLeadForm ? [toMessage({ role: "assistant" as const, leadForm: true })] : []),
    ])
  }

  function handleSend(text: string, photos: PhotoAttachment[]) {
    if (photos.length > 0) {
      const updated = mergeProjectState(projectStateRef.current, {
        photos: [...(projectStateRef.current.photos ?? []), ...photos.map((p) => p.url)],
      })
      projectStateRef.current = updated
      setMessages((prev) => [...prev, toMessage({ role: "user", photoNotice: photos })])
      setTyping(true)
      setTimeout(() => {
        setTyping(false)
        setMessages((prev) => [...prev, toMessage({ role: "assistant", text: "Thanks — I've added those photos to your project." })])
        if (text) void handleUserTurn(text)
      }, 500)
      return
    }
    if (text) void handleUserTurn(text)
  }

  function handleQuickAction(action: ChatAction) {
    const match = QUICK_ACTIONS.find((a) => a.id === action.id)
    void handleUserTurn(action.label, match?.prompt ?? action.label)
  }

  function handleReadyToMoveForward() {
    void handleUserTurn("I'm Ready to Move Forward", "I'm ready to move forward with this estimate.", true)
  }

  function handleAdjustProject() {
    void handleUserTurn("Adjust My Project", "I'd like to adjust some details of the project.")
  }

  function handleLeadFormSubmit(data: LeadFormData) {
    const lead = {
      ...data,
      project: projectStateRef.current,
      createdAt: new Date().toISOString(),
    }
    saveDemoLead(lead)
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((prev) => [...prev, toMessage({ role: "assistant", leadSuccess: true })])
    }, 400)
  }

  return (
    <div
      role="dialog"
      aria-label="Best Buy Floors AI Project Assistant"
      className="fixed inset-0 z-50 flex flex-col bg-paper sm:inset-auto sm:bottom-32 sm:right-6 sm:h-[680px] sm:max-h-[80vh] sm:w-[420px] sm:rounded-sm sm:border sm:border-hairline sm:shadow-2xl"
    >
      <ChatHeader onClose={onClose} />

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((message, i) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAction={handleQuickAction}
            onReadyToMoveForward={handleReadyToMoveForward}
            onAdjustProject={handleAdjustProject}
            onLeadSubmit={handleLeadFormSubmit}
            isLatest={i === messages.length - 1}
          />
        ))}
        {typing && (
          <div className="flex justify-start">
            <TypingIndicator />
          </div>
        )}
      </div>

      <Composer onSend={handleSend} placeholder={`Try: "${placeholder}"`} disabled={typing} />
    </div>
  )
}
