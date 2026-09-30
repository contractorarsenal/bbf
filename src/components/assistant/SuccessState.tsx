import { CheckCircle2 } from "lucide-react"

export function SuccessState() {
  return (
    <div className="mt-2 flex flex-col items-center gap-2 rounded-sm border border-gold/50 bg-paper-warm px-5 py-6 text-center">
      <CheckCircle2 size={28} className="text-gold-dark" aria-hidden="true" />
      <p className="font-display text-xl text-ink">You're all set.</p>
      <p className="max-w-xs text-sm text-ink/65">
        Your project details are ready for the Best Buy Floors team to review. Someone will follow up using the
        contact method you chose.
      </p>
    </div>
  )
}
