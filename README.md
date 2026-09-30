# Best Buy Floors — AI Project Assistant Demo

Standalone demo of an AI Project Assistant embedded in a homepage replica of
[bestbuyfloorsinc.com](https://www.bestbuyfloorsinc.com/) (Bellevue Design
Center by Best Buy Floors). Built to show the concept convincingly — it is
**not** the production website and does not modify it.

## Run locally

Plain `npm run dev` only serves the static frontend — the assistant needs the
Cloudflare Worker running too, so use:

```bash
npm install
npm run build
npx wrangler dev      # serves dist/ + POST /api/assistant on http://localhost:8787
```

For live-reloading frontend development, run `npm run dev` (Vite, port 5173)
in a second terminal alongside `wrangler dev` — but note the assistant itself
only responds through the Worker's port (8787), since that's where
`/api/assistant` lives.

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.worker.json
npm run build
npx wrangler deploy --dry-run
```

## How the assistant works

**Claude (Anthropic) is the real conversational engine.** The browser never
calls Anthropic directly — every turn goes:

```
Browser → POST /api/assistant → Cloudflare Worker (worker.ts) → Anthropic API
```

`src/server/ai/anthropic.ts` runs a proper multi-round tool-calling loop
against the Messages API with four tools:

- **`update_project`** — Claude calls this only with information the customer
  actually stated or clearly confirmed. The system prompt explicitly forbids
  inferring project data from insults, jokes, or unrelated text — hostile or
  irrelevant input never touches project state.
- **`calculate_flooring_quote`** — the *only* place a price can come from.
  Claude never states a dollar figure that didn't come back from this tool,
  which calls the fully deterministic `src/lib/quote-engine.ts` against
  `src/data/pricing.json` (placeholder demo pricing, clearly marked
  `demo: true`).
- **`get_business_knowledge`** — looks up sections of `src/data/knowledge.ts`
  (the company facts) by topic. The full knowledge base is also included in
  the system prompt directly for reliability.
- **`complete_lead`** — available to the model, though in this demo the
  contact-info handoff is actually a dedicated UI form
  (`LeadCapture.tsx`) triggered client-side, not something Claude fills in
  conversationally — see "Leads" below.

Claude decides what to ask, how to explain tradeoffs, when enough
information exists for an estimate, and how to handle hostile/off-topic
input. It never computes pricing itself.

- **Pricing:** all math lives in `src/lib/quote-engine.ts`. Placeholder
  numbers live in `src/data/pricing.json`, clearly marked `demo: true`.
  **Replace these with Best Buy Floors' approved pricing before any
  production use.**
- **Knowledge:** `src/data/knowledge.ts` (kept in sync with `knowledge.md`
  for human readability) is the source of truth for company facts. Anything
  not in there, the assistant defers to the team rather than guessing.
- **Leads:** on "I'm Ready to Move Forward," the client shows a compact
  contact form (`LeadCapture.tsx`), saves the lead to `localStorage`
  (`src/lib/project-state.ts`), and logs a CRM-shaped payload to the browser
  console (`[Best Buy Floors demo] Lead ready for CRM handoff:`). Nothing is
  sent to any external service in this demo.
- **Deposits:** intentionally not implemented. The quote card shows a
  disabled "Reserve My Project" notice explaining it's pending Best Buy
  Floors' approval of deposit terms and a payment provider — Phase 2.

### Dev-only fallback (not the primary experience)

`src/lib/conversation-engine.ts` is a deterministic, keyword-driven engine
kept *only* as a fallback for local development without Anthropic access —
e.g. running plain `vite dev` with no Worker present. The client
(`ChatPanel.tsx`) always tries `POST /api/assistant` first; it only drops to
this local engine if that request fails outright (network error / no
endpoint). If the Worker route exists but Anthropic itself errors (bad key,
API outage), the Worker returns a controlled message — "I'm having trouble
connecting right now. You can still call the Best Buy Floors team at
+1 (425) 699-9251." — and that is never silently swapped for the scripted
engine. See `worker.ts`.

## Environment variables

Server-side only (Cloudflare Worker env), never exposed to the client and
never prefixed `VITE_`:

```
AI_PROVIDER=demo        # "demo" (fallback engine) or "anthropic" (real Claude)
ANTHROPIC_API_KEY=      # required when AI_PROVIDER=anthropic
```

For local `wrangler dev`, copy `.env.example` to `.dev.vars` and fill in a
real key (both gitignored). In production:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
```

Never commit a real key. Never log it (the Worker logs only the error
message on an Anthropic failure, not request headers or the key).

## Deploying to Cloudflare

```bash
npx wrangler login   # one-time, opens a browser OAuth flow
npm run deploy       # builds, then `wrangler deploy`
```

This uses the Workers + Static Assets model: `wrangler.toml` points `main` at
`worker.ts` and serves the built `dist/` folder as static assets via the
`ASSETS` binding, with `/api/assistant` handled by the same Worker.

## Known gaps / intentionally left for Phase 2

- Real Best Buy Floors pricing (currently placeholder, clearly marked).
- Real customer review text is used (pulled from the live site, attributed),
  but isn't wired to a live Google/Birdeye feed.
- `complete_lead` is defined as a tool but not exercised by the actual lead
  flow, which uses a dedicated form instead of conversational collection —
  see "Leads" above.
- Deposit / payment collection.
- Photo analysis: photos are stored as local blob URLs only, never uploaded
  or sent to Claude, and the assistant never claims to have inspected them.
- No server-side session persistence — conversation history and project
  state are round-tripped from the client on every request rather than
  stored server-side.
