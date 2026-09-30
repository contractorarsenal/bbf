import { ArrowRight, Lock } from "lucide-react"
import type { QuoteResult } from "../../types/project"

interface QuoteCardProps {
  quote: QuoteResult
  onReadyToMoveForward: () => void
  onAdjustProject: () => void
  disabled?: boolean
}

const formatCurrency = (n: number) => `$${n.toLocaleString()}`

export function QuoteCard({ quote, onReadyToMoveForward, onAdjustProject, disabled }: QuoteCardProps) {
  return (
    <div className="mt-2 overflow-hidden rounded-sm border border-gold/50 bg-paper">
      <div className="flex items-center justify-between border-b border-hairline bg-paper-warm px-4 py-2.5">
        <h3 className="font-display text-lg text-ink">Your Project Estimate</h3>
        {quote.demo && (
          <span className="rounded-sm bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-paper">
            Demo Estimate
          </span>
        )}
      </div>

      <div className="px-4 py-4">
        <ul className="space-y-2">
          {quote.items.map((item) => (
            <li key={item.label} className="flex items-baseline justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-ink">{item.label}</p>
                <p className="text-xs text-ink/55">{item.detail}</p>
              </div>
              <p className="whitespace-nowrap text-ink/70">
                {formatCurrency(item.low)}&ndash;{formatCurrency(item.high)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-sm bg-paper-warm px-4 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink/50">Estimated Range</p>
          <p className="font-display text-2xl text-gold-dark">
            {formatCurrency(quote.low)} &ndash; {formatCurrency(quote.high)}
          </p>
        </div>

        {quote.assumptions.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-ink/55">
            {quote.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs leading-relaxed text-ink/60">{quote.disclaimer}</p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onReadyToMoveForward}
            className="flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            I'm Ready to Move Forward
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onAdjustProject}
            className="rounded-sm border border-hairline px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:border-gold hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Adjust My Project
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-sm border border-dashed border-hairline px-3 py-2.5 text-xs text-ink/50">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-medium text-ink/70">Reserve My Project</span> — deposit collection can be
            enabled after Best Buy Floors approves deposit amounts, terms, refund policy, and payment provider.
          </p>
        </div>
      </div>
    </div>
  )
}
