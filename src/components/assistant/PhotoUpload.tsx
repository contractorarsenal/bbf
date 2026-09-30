import { X } from "lucide-react"
import type { PhotoAttachment } from "../../types/chat"

interface PhotoUploadProps {
  photos: PhotoAttachment[]
  onRemove?: (id: string) => void
  size?: "sm" | "md"
}

export function PhotoUpload({ photos, onRemove, size = "md" }: PhotoUploadProps) {
  if (photos.length === 0) return null
  const dim = size === "sm" ? "h-12 w-12" : "h-16 w-16"

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Uploaded photos">
      {photos.map((photo) => (
        <div key={photo.id} role="listitem" className={`relative ${dim} shrink-0 overflow-hidden rounded-sm border border-hairline`}>
          <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(photo.id)}
              aria-label={`Remove ${photo.name}`}
              className="absolute right-0.5 top-0.5 rounded-full bg-ink/70 p-0.5 text-paper hover:bg-ink"
            >
              <X size={11} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
