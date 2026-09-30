import type { ChatAction } from "../../types/chat"

interface QuickActionsProps {
  actions: ChatAction[]
  onSelect: (action: ChatAction) => void
  disabled?: boolean
}

export function QuickActions({ actions, onSelect, disabled }: QuickActionsProps) {
  if (actions.length === 0) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action)}
          className="rounded-sm border border-gold/60 bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
