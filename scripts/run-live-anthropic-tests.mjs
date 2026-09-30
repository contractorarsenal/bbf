#!/usr/bin/env node
// Live integration tests against the real Anthropic API, using the
// AnthropicProvider exactly as the Worker calls it. Requires a real
// ANTHROPIC_API_KEY — reads it from .dev.vars (gitignored) if present,
// otherwise from the environment. Skips with a clear message if neither
// is available, so this never hard-fails in an environment without a key.
//
// Run with: npm run test:live

import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function loadDevVars() {
  const path = join(root, ".dev.vars")
  if (!existsSync(path)) return
  const lines = readFileSync(path, "utf8").split("\n")
  for (const line of lines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
loadDevVars()

if (!process.env.ANTHROPIC_API_KEY) {
  console.log("SKIPPED: no ANTHROPIC_API_KEY found (checked .dev.vars and environment). Live Anthropic tests require a real key.")
  process.exit(0)
}

const { AnthropicProvider } = await import(join(root, "src/server/ai/anthropic.ts"))

const provider = new AnthropicProvider({
  AI_PROVIDER: "anthropic",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
})

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  PASS: ${message}`)
  } else {
    failed++
    console.log(`  FAIL: ${message}`)
  }
}

async function conversation() {
  let history = []
  let projectState = {}
  const turns = []

  async function send(message) {
    const reply = await provider.respond({ message, history, projectState })
    projectState = reply.projectState
    history = [...history, { role: "user", text: message }, { role: "assistant", text: reply.reply }]
    turns.push({ message, reply: reply.reply, projectState, quote: reply.quote })
    return reply
  }

  return { send, turns, getState: () => projectState }
}

console.log("\n=== TEST: exact failed conversation — 'Get a Flooring Quote' -> carpet -> '72 maybe' ===")
{
  const convo = await conversation()
  await convo.send("I'd like to get a flooring quote.")
  await convo.send("carpet")
  const r3 = await convo.send("72 maybe")
  assert(convo.getState().squareFeet === 72, `squareFeet resolves to 72 after '72 maybe' (got ${convo.getState().squareFeet})`)
  const r4 = await convo.send("72 maybe")
  assert(
    !/how many square feet|square footage/i.test(r4.reply),
    `does NOT ask square footage again on repeat (reply: "${r4.reply.slice(0, 80)}...")`,
  )
  console.log(`  (turn 3 reply: "${r3.reply.slice(0, 100)}...")`)
  console.log(`  (turn 4 reply: "${r4.reply.slice(0, 100)}...")`)
}

console.log("\n=== TEST: correction flow — 72 -> 'actually 90' -> finish quote must use 90 ===")
{
  const convo = await conversation()
  await convo.send("I'd like to get a flooring quote.")
  await convo.send("carpet")
  await convo.send("72")
  assert(convo.getState().squareFeet === 72, `squareFeet is 72 before correction (got ${convo.getState().squareFeet})`)
  await convo.send("actually 90")
  assert(convo.getState().squareFeet === 90, `squareFeet corrected to 90 (got ${convo.getState().squareFeet})`)
  const r = await convo.send("no stairs, no existing flooring to remove, please give me the quote")
  assert(r.quote !== undefined, "a quote was generated")
  if (r.quote) {
    const materialLine = r.quote.items.find((i) => /carpet/i.test(i.label))
    assert(materialLine !== undefined, "quote includes a carpet material line")
    if (materialLine) {
      // pricing.json carpet material low/high: 3.00 - 6.00 per sqft * 90
      assert(materialLine.low === Math.round(3.0 * 90), `material low uses 90 sqft (got ${materialLine.low}, expected ${Math.round(3.0 * 90)})`)
      assert(materialLine.high === Math.round(6.0 * 90), `material high uses 90 sqft (got ${materialLine.high}, expected ${Math.round(6.0 * 90)})`)
    }
  }
}

console.log("\n=== TEST: state correction — 1,800 -> 'Actually I checked, it's 1,650' ===")
{
  const convo = await conversation()
  await convo.send("I want LVP, about 1,800 sqft.")
  assert(convo.getState().squareFeet === 1800, `squareFeet is 1800 (got ${convo.getState().squareFeet})`)
  await convo.send("Actually I checked, it's 1,650.")
  assert(convo.getState().squareFeet === 1650, `squareFeet corrected to 1650 (got ${convo.getState().squareFeet})`)
}

console.log("\n=== TEST: hostile input never modifies project state ===")
{
  const convo = await conversation()
  await convo.send("I'd like to get a flooring quote.")
  await convo.send("LVP")
  await convo.send("1800 sqft")
  const before = { ...convo.getState() }
  const r = await convo.send("fuck you")
  assert(JSON.stringify(convo.getState()) === JSON.stringify(before), "project state unchanged after hostile input")
  assert(!/fuck/i.test(r.reply), "reply does not repeat the hostile text")
}

console.log("\n=== TEST: 'Talk to the Team' does not enter flooring qualification ===")
{
  const convo = await conversation()
  const r = await convo.send("I'd like to talk to the team.")
  assert(
    !/square feet|flooring type|what type of flooring/i.test(r.reply),
    `reply does not ask qualification questions (reply: "${r.reply.slice(0, 100)}...")`,
  )
  assert(convo.getState().flooringType === undefined, "flooringType was not set")
}

console.log("\n=== TEST: 'Ask a Product Question' does not force qualification ===")
{
  const convo = await conversation()
  const r = await convo.send("I have a question about your flooring products.")
  assert(
    !/square feet|how many square/i.test(r.reply),
    `reply does not ask for square footage (reply: "${r.reply.slice(0, 100)}...")`,
  )
}

console.log("\n=== TEST: mid-qualification tangent gets answered directly, not deflected ===")
{
  const convo = await conversation()
  await convo.send("I'd like to get a flooring quote.")
  await convo.send("I'm thinking LVP, about 1200 sqft")
  const r = await convo.send("Actually what's the difference between LVP and engineered hardwood?")
  assert(
    /engineered hardwood|real wood|synthetic/i.test(r.reply),
    `answers the actual question about LVP vs engineered hardwood (reply: "${r.reply.slice(0, 120)}...")`,
  )
  assert(!/^(how many square feet)/i.test(r.reply.trim()), "does not respond with a bare qualification question instead of answering")
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
