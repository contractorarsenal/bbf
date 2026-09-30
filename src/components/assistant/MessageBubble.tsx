import type { ChatAction, ChatMessage } from "../../types/chat"
import type { LeadFormData } from "../../lib/conversation-engine"
import { QuickActions } from "./QuickActions"
import { QuoteCard } from "./QuoteCard"
import { LeadCapture } from "./LeadCapture"
import { SuccessState } from "./SuccessState"
import { PhotoUpload } from "./PhotoUpload"

interface MessageBubbleProps {
  message: ChatMessage
  onAction: (action: ChatAction) => void
  onReadyToMoveForward: () => void
  onAdjustProject: () => void
  onLeadSubmit: (data: LeadFormData) => void
  isLatest: boolean
}

export function MessageBubble({
  message,
  onAction,
  onReadyToMoveForward,
  onAdjustProject,
  onLeadSubmit,
  isLatest,
}: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[86%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {message.text && (
          <div
            className={
              isUser
                ? "rounded-sm bg-ink px-3.5 py-2.5 text-sm text-paper"
                : "rounded-sm border border-hairline bg-paper px-3.5 py-2.5 text-sm text-ink"
            }
          >
            {message.text}
          </div>
        )}

        {message.photoNotice && message.photoNotice.length > 0 && (
          <div className={message.text ? "mt-2" : ""}>
            <PhotoUpload photos={message.photoNotice} size="sm" />
          </div>
        )}

        {message.actions && message.actions.length > 0 && (
          <QuickActions actions={message.actions} onSelect={onAction} disabled={!isLatest} />
        )}

        {message.quote && (
          <div className="w-full">
            <QuoteCard quote={message.quote} onReadyToMoveForward={onReadyToMoveForward} onAdjustProject={onAdjustProject} />
          </div>
        )}

        {message.leadForm && (
          <div className="w-full">
            <LeadCapture onSubmit={onLeadSubmit} />
          </div>
        )}

        {message.leadSuccess && <SuccessState />}
      </div>
    </div>
  )
}
