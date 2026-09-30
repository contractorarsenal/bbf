import { useEffect, useRef, useState } from "react"
import type { ChatAction, ChatMessage, ConversationContext, PhotoAttachment } from "../../types/chat"
import {
  createInitialContext,
  handleAction,
  handleLeadSubmit,
  handlePhotosAdded,
  handleUserMessage,
  handleWelcome,
} from "../../lib/conversation-engine"
import type { LeadFormData } from "../../lib/conversation-engine"
import { ChatHeader } from "./ChatHeader"
import { MessageBubble } from "./MessageBubble"
import { TypingIndicator } from "./TypingIndicator"
import { Composer } from "./Composer"
import { EXAMPLE_PROMPTS } from "../../data/demoConversations"

type Stub = Omit<ChatMessage, "id" | "createdAt">

function toMessage(stub: Stub): ChatMessage {
  return {
    ...stub,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  }
}

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const contextRef = useRef<ConversationContext>(createInitialContext())
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const placeholderRef = useRef(EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)])

  useEffect(() => {
    if (messages.length === 0) {
      const { messages: stubs, context } = handleWelcome(contextRef.current)
      contextRef.current = context
      setMessages(stubs.map(toMessage))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing])

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
    }
  }, [])

  function queueAssistantReply(stubs: Stub[]) {
    if (stubs.length === 0) return
    setTyping(true)
    typingTimeout.current = setTimeout(
      () => {
        setTyping(false)
        setMessages((prev) => [...prev, ...stubs.map(toMessage)])
      },
      550 + Math.random() * 350,
    )
  }

  function handleSend(text: string, photos: PhotoAttachment[]) {
    const immediateUser: ChatMessage[] = []
    let pendingAssistant: Stub[] = []
    let context = contextRef.current

    if (photos.length > 0) {
      const result = handlePhotosAdded(context, photos)
      context = result.context
      for (const stub of result.messages) {
        if (stub.role === "user") immediateUser.push(toMessage(stub))
        else pendingAssistant.push(stub)
      }
    }

    if (text) {
      immediateUser.push(toMessage({ role: "user", text }))
      const result = handleUserMessage(context, text)
      context = result.context
      pendingAssistant = [...pendingAssistant, ...result.messages]
    }

    contextRef.current = context
    if (immediateUser.length > 0) setMessages((prev) => [...prev, ...immediateUser])
    queueAssistantReply(pendingAssistant)
  }

  function handleQuickAction(action: ChatAction) {
    const userEcho = toMessage({ role: "user", text: action.label })
    setMessages((prev) => [...prev, userEcho])
    const result = handleAction(contextRef.current, action.id)
    contextRef.current = result.context
    queueAssistantReply(result.messages)
  }

  function handleReadyToMoveForward() {
    handleQuickAction({ id: "action:ready-to-move-forward", label: "I'm Ready to Move Forward" })
  }

  function handleAdjustProject() {
    handleQuickAction({ id: "action:adjust-project", label: "Adjust My Project" })
  }

  function handleLeadFormSubmit(data: LeadFormData) {
    const result = handleLeadSubmit(contextRef.current, data)
    contextRef.current = result.context
    queueAssistantReply(result.messages)
  }

  return (
    <div
      role="dialog"
      aria-label="Best Buy Floors AI Project Assistant"
      className="fixed inset-0 z-50 flex flex-col bg-paper sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[700px] sm:max-h-[85vh] sm:w-[420px] sm:rounded-sm sm:border sm:border-hairline sm:shadow-2xl"
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

      <Composer onSend={handleSend} placeholder={`Try: "${placeholderRef.current}"`} disabled={typing} />
    </div>
  )
}
