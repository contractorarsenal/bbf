export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-sm border border-hairline bg-paper px-3 py-2.5" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  )
}
