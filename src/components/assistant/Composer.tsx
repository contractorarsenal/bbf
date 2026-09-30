import { useRef, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import { Paperclip, Send } from "lucide-react"
import type { PhotoAttachment } from "../../types/chat"
import { PhotoUpload } from "./PhotoUpload"

interface ComposerProps {
  onSend: (text: string, photos: PhotoAttachment[]) => void
  placeholder: string
  disabled?: boolean
}

export function Composer({ onSend, placeholder, disabled }: ComposerProps) {
  const [text, setText] = useState("")
  const [staged, setStaged] = useState<PhotoAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const attachments: PhotoAttachment[] = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    setStaged((prev) => [...prev, ...attachments])
    e.target.value = ""
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((p) => p.id !== id))
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed && staged.length === 0) return
    onSend(trimmed, staged)
    setText("")
    setStaged([])
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-hairline bg-paper px-3 py-3">
      {staged.length > 0 && (
        <div className="mb-2">
          <PhotoUpload photos={staged} onRemove={removeStaged} size="sm" />
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
          aria-hidden="true"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photos"
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-hairline text-ink/60 hover:border-gold hover:text-gold-dark disabled:opacity-50"
        >
          <Paperclip size={16} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="max-h-28 min-h-10 flex-1 resize-none rounded-sm border border-hairline bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-gold disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || (!text.trim() && staged.length === 0)}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink text-paper transition-colors hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </form>
  )
}
