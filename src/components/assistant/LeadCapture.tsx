import { useState } from "react"
import type { FormEvent } from "react"
import type { LeadFormData } from "../../lib/conversation-engine"

interface LeadCaptureProps {
  onSubmit: (data: LeadFormData) => void
  disabled?: boolean
}

const inputClass =
  "w-full rounded-sm border border-hairline bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-gold"

export function LeadCapture({ onSubmit, disabled }: LeadCaptureProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [zipCode, setZipCode] = useState("")
  const [preferredContact, setPreferredContact] = useState<LeadFormData["preferredContact"]>("phone")
  const [submitted, setSubmitted] = useState(false)

  const valid = firstName.trim() && lastName.trim() && phone.trim() && email.trim()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid || submitted) return
    setSubmitted(true)
    onSubmit({ firstName, lastName, phone, email, zipCode: zipCode || undefined, preferredContact })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 space-y-3 rounded-sm border border-hairline bg-paper p-4"
      aria-label="Project contact details"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-ink/70">
          First name
          <input
            className={`${inputClass} mt-1`}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            disabled={disabled || submitted}
          />
        </label>
        <label className="block text-xs font-medium text-ink/70">
          Last name
          <input
            className={`${inputClass} mt-1`}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            disabled={disabled || submitted}
          />
        </label>
      </div>

      <label className="block text-xs font-medium text-ink/70">
        Phone
        <input
          type="tel"
          className={`${inputClass} mt-1`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={disabled || submitted}
        />
      </label>

      <label className="block text-xs font-medium text-ink/70">
        Email
        <input
          type="email"
          className={`${inputClass} mt-1`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={disabled || submitted}
        />
      </label>

      <label className="block text-xs font-medium text-ink/70">
        Project ZIP (optional)
        <input
          className={`${inputClass} mt-1`}
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          disabled={disabled || submitted}
        />
      </label>

      <fieldset className="text-xs font-medium text-ink/70">
        <legend className="mb-1">Preferred contact method</legend>
        <div className="flex gap-4">
          {(["phone", "email", "text"] as const).map((method) => (
            <label key={method} className="flex items-center gap-1.5 font-normal capitalize text-ink/80">
              <input
                type="radio"
                name="preferredContact"
                value={method}
                checked={preferredContact === method}
                onChange={() => setPreferredContact(method)}
                disabled={disabled || submitted}
              />
              {method}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={!valid || disabled || submitted}
        className="w-full rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitted ? "Submitted" : "Submit My Details"}
      </button>
    </form>
  )
}
