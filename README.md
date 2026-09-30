# Best Buy Floors — AI Project Assistant Demo

Standalone demo of an AI Project Assistant embedded in a homepage replica of
[bestbuyfloorsinc.com](https://www.bestbuyfloorsinc.com/) (Bellevue Design
Center by Best Buy Floors). Built to show the concept convincingly — it is
**not** the production website and does not modify it.

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint        # oxlint
npx tsc --noEmit     # type-check
npm run build        # production build
```

## How the assistant works

- **Demo mode (default, no API key needed):** `src/lib/conversation-engine.ts`
  is a deterministic, keyword-driven dialogue engine that runs entirely in
  the browser. It recognizes natural phrasing ("I have 2000 square feet",
  "what's better, LVP or hardwood?", "I have dogs and kids", etc.), updates
  structured project state, and drives the qualify → estimate → lead-capture
  flow. See `src/data/demoConversations.ts` for example phrasings it expects.
- **Pricing:** all math lives in `src/lib/quote-engine.ts`. The conversation
  engine never invents a price — it only gathers inputs and calls the quote
  engine. Placeholder numbers live in `src/data/pricing.json`, clearly marked
  `demo: true`. **Replace these with Best Buy Floors' approved pricing before
  any production use.**
- **Knowledge:** `src/data/knowledge.md` is the source of truth for company
  facts the assistant can state. Anything not in there, the assistant
  defers to the team rather than guessing.
- **Leads:** on "I'm Ready to Move Forward," the assistant collects contact
  details in `src/components/assistant/LeadCapture.tsx`, saves the lead to
  `localStorage` (`src/lib/project-state.ts`), and logs a CRM-shaped payload
  to the browser console (`[Best Buy Floors demo] Lead ready for CRM
  handoff:`). Nothing is sent to any external service in this demo.
- **Deposits:** intentionally not implemented. The quote card shows a
  disabled "Reserve My Project" notice explaining it's pending Best Buy
  Floors' approval of deposit terms and a payment provider — Phase 2.

## Enabling a real LLM later (Anthropic)

The frontend never talks to Anthropic directly. The intended path is:

```
Browser → Cloudflare Worker (worker.ts) → Anthropic API
```

`src/server/ai/provider.ts` picks a provider based on server-side env vars
(`AI_PROVIDER`, `ANTHROPIC_API_KEY`) and falls back to the same deterministic
demo engine if no key is configured — the app never breaks from a missing
key. `src/server/ai/anthropic.ts` has the system prompt and tool definitions
(`update_project_state`, `calculate_flooring_quote`, `complete_lead`)
already wired up; pricing still only ever happens in `quote-engine.ts`, never
inside the model's own output. This endpoint is not called by the current
frontend — hooking the chat UI up to it is a Phase 2 change, and at that
point only the provider needs to change, not the UI.

Required env vars (see `.env.example`):

```
DEMO_MODE=true
AI_PROVIDER=demo        # or "anthropic"
ANTHROPIC_API_KEY=      # set only server-side (Cloudflare project env vars), never in client code
```

## Deploying to Cloudflare

```bash
npx wrangler login   # one-time, opens a browser OAuth flow
npm run deploy       # builds, then `wrangler deploy`
```

This uses the Workers + Static Assets model: `wrangler.toml` points `main` at
`worker.ts` (the Worker entry point described above) and serves the built
`dist/` folder as static assets via the `ASSETS` binding, with `/api/assistant`
handled by the Worker. `npm run cf:dev` runs the same thing locally via
`wrangler dev`.

## Known gaps / intentionally left for Phase 2

- Real Best Buy Floors pricing (currently placeholder, clearly marked).
- Real customer review text (placeholder cards are explicitly labeled as
  such rather than presenting invented quotes as genuine).
- Anthropic provider is prepared but not wired into the chat UI or exercised
  by the demo; its tool-use loop is single-turn (no multi-round tool result
  exchange yet).
- Deposit / payment collection.
- Photo analysis by the assistant (photos are stored as local blob URLs only
  — never uploaded anywhere, and the assistant doesn't claim to inspect
  them).
