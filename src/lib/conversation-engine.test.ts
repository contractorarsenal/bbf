import { describe, expect, it } from "vitest"
import { createInitialContext, handleUserMessage } from "./conversation-engine"
import type { ConversationContext } from "../types/chat"
import type { FlooringProject } from "../types/project"

/**
 * Regression tests for the reported bug: "About how many square feet are we
 * working with?" repeating forever for "72 maybe" / "72 maybe" / "72".
 *
 * Root cause: the server-side DemoProvider is stateless per request — it
 * rebuilds a fresh ConversationContext (losing pendingField/askedQuestions)
 * on every call, carrying forward only the plain FlooringProject. The old
 * bare-number extractor only fired when pendingField === "squareFeet", which
 * never survives that stateless round-trip, so un-suffixed numbers like "72"
 * never parsed. These tests simulate that exact stateless contract — NOT the
 * persisted-context client fallback — because that's what actually
 * reproduced the bug.
 */
function statelessServerTurn(userText: string, projectState: FlooringProject) {
  const context: ConversationContext = { ...createInitialContext(), project: projectState }
  const { messages, context: nextContext } = handleUserMessage(context, userText)
  const reply = messages.map((m) => m.text).filter((t): t is string => Boolean(t)).join("\n\n")
  return { reply, projectState: nextContext.project }
}

describe("stateless server-side project state persistence", () => {
  it("extracts squareFeet from a bare number with no unit", () => {
    const { projectState } = statelessServerTurn("72", { flooringType: "carpet" })
    expect(projectState.squareFeet).toBe(72)
  })

  it("extracts squareFeet from a hedged bare number ('72 maybe')", () => {
    const { projectState } = statelessServerTurn("72 maybe", { flooringType: "carpet" })
    expect(projectState.squareFeet).toBe(72)
  })

  it("extracts squareFeet from 'around 72'", () => {
    const { projectState } = statelessServerTurn("around 72", { flooringType: "carpet" })
    expect(projectState.squareFeet).toBe(72)
  })

  it("extracts squareFeet from 'probably 72 sqft'", () => {
    const { projectState } = statelessServerTurn("probably 72 sqft", { flooringType: "carpet" })
    expect(projectState.squareFeet).toBe(72)
  })

  it("extracts squareFeet from 'about 1,800 square feet'", () => {
    const { projectState } = statelessServerTurn("about 1,800 square feet", { flooringType: "carpet" })
    expect(projectState.squareFeet).toBe(1800)
  })

  it("does NOT ask for square footage again once it's known, across separate stateless requests", () => {
    let projectState: FlooringProject = { flooringType: "carpet" }
    const turn1 = statelessServerTurn("72 maybe", projectState)
    projectState = turn1.projectState
    expect(projectState.squareFeet).toBe(72)

    // A second, independent stateless request (fresh context each time) with
    // the accumulated projectState carried forward, as the wire contract
    // actually does.
    const turn2 = statelessServerTurn("72 maybe", projectState)
    expect(turn2.reply).not.toContain("how many square feet")
    expect(turn2.projectState.squareFeet).toBe(72)
  })

  it("the exact reported failing conversation now resolves squareFeet and stops looping", () => {
    let projectState: FlooringProject = {}
    let reply: string

    ;({ reply, projectState } = statelessServerTurn("I'd like to get a flooring quote.", projectState))
    ;({ reply, projectState } = statelessServerTurn("carpet", projectState))
    expect(projectState.flooringType).toBe("carpet")

    ;({ reply, projectState } = statelessServerTurn("72 maybe", projectState))
    expect(projectState.squareFeet).toBe(72)

    const askedSquareFeetAgain = (r: string) => /how many square feet/i.test(r)

    ;({ reply, projectState } = statelessServerTurn("72 maybe", projectState))
    expect(askedSquareFeetAgain(reply)).toBe(false)
    expect(projectState.squareFeet).toBe(72)

    ;({ reply, projectState } = statelessServerTurn("72", projectState))
    expect(askedSquareFeetAgain(reply)).toBe(false)
    expect(projectState.squareFeet).toBe(72)
  })

  it("does not corrupt existingFlooring with a stray bare number", () => {
    const projectState: FlooringProject = { flooringType: "carpet", squareFeet: 72 }
    const { projectState: after } = statelessServerTurn("72 maybe", projectState)
    expect(after.existingFlooring).toBeUndefined()
  })

  it("hostile input never modifies project state", () => {
    const projectState: FlooringProject = { flooringType: "lvp", squareFeet: 1800 }
    const { reply, projectState: after } = statelessServerTurn("fuck you", projectState)
    expect(after).toEqual(projectState)
    expect(reply.toLowerCase()).not.toContain("fuck")
  })
})

describe("client-side persisted-context fallback (useRef-backed, pendingField survives)", () => {
  it("still resolves squareFeet and existingFlooring correctly across a full persisted conversation", () => {
    let ctx = createInitialContext()
    const step = (text: string) => {
      const result = handleUserMessage(ctx, text)
      ctx = result.context
      return result.messages.map((m) => m.text).filter(Boolean).join("\n\n")
    }
    step("I'd like to get a flooring quote.")
    step("carpet")
    step("72 maybe")
    expect(ctx.project.squareFeet).toBe(72)
    step("I have carpet down there now, please remove it")
    expect(ctx.project.existingFlooring).toBeDefined()
    expect(ctx.project.removalRequired).toBe(true)
  })
})
