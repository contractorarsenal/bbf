#!/usr/bin/env node
// Dev-only token/context instrumentation. Runs the 6 representative prompts
// from the token-efficiency audit against the real Anthropic API and reports
// exact input/output token counts (from Anthropic's own `usage` field, not
// an estimate), history length, and knowledge sections included.
//
// Run with: TOKEN_QA=1 node scripts/token-qa.mjs

import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function loadDevVars() {
  const path = join(root, ".dev.vars")
  if (!existsSync(path)) return
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
loadDevVars()
if (!process.env.ANTHROPIC_API_KEY) {
  console.log("SKIPPED: no ANTHROPIC_API_KEY found.")
  process.exit(0)
}

const { AnthropicProvider } = await import(join(root, "src/server/ai/anthropic.ts"))
const provider = new AnthropicProvider({
  AI_PROVIDER: "anthropic",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  TOKEN_QA: "1",
})

// Each scenario builds on the last, mirroring a real conversation, so later
// turns (D, E) reflect realistic accumulated history length.
let history = []
let projectState = {}
const results = []

async function turn(label, message) {
  const t0 = Date.now()
  const reply = await provider.respond({ message, history, projectState })
  const ms = Date.now() - t0
  projectState = reply.projectState
  history = [...history, { role: "user", text: message }, { role: "assistant", text: reply.reply }]
  results.push({ label, message, replyPreview: reply.reply.slice(0, 90), ms })
  console.log(`\n[${label}] "${message}"  (${ms}ms)`)
  console.log(`  reply: "${reply.reply.slice(0, 140)}${reply.reply.length > 140 ? "..." : ""}"`)
  return reply
}

await turn("A", "what's 2+2")
await turn("B", "which material holds up best with pets or kids?")
await turn("C", "LVP sounds good, what's that cost?")
await turn("D", "around 72")
await turn("E", "Actually it's the whole house, about 5,000 sqft.")
await turn("F", "Do you offer financing?")

console.log("\n(See [TOKEN_QA] lines above for exact input/output tokens per Anthropic API call.)")
