// @vitest-environment jsdom
// useTipQa unit tests — hook data path + realtime wiring.
//
// Named `*.dom.test.ts` so vitest's environmentMatchGlobs runs it in jsdom
// (renderHook needs a DOM). No JSX needed: hooks render via
// React.createElement through renderHook.
//
// Supabase is faked with per-table thenable builders (same approach as
// tests/use-tips.test.ts, but one builder per table since useTipQa reads
// users / tip_questions / tip_answers in one pass). A channel() stub
// records postgres_changes handlers so tests can fire events and assert
// the debounced refetch.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createElement } from "react"
import { renderHook, act, waitFor } from "@testing-library/react"
import { createQueryBuilder, mockSupabaseModule, type SupabaseResult } from "./helpers/supabase-mock"

// ---------------------------------------------------------------- test data
const QUESTIONS = [
  { id: "q1", tip_id: "tip1", user_id: "u-me", question: "How much cement for a 1-2-4 mix?", created_at: "2026-09-02T00:00:00Z", asker: { full_name: "Me", role: "user" } },
  { id: "q2", tip_id: "tip1", user_id: "u-other", question: "Does this apply to masonry too?", created_at: "2026-09-01T00:00:00Z", asker: { full_name: "Other", role: "user" } },
]
const ANSWERS = [
  { id: "a1", question_id: "q2", user_id: "u-expert", answer: "Yes, works for mortar.", is_expert: true, created_at: "2026-09-01T05:00:00Z", answerer: { full_name: "Expert", role: "user" } },
  { id: "a2", question_id: "q1", user_id: "u-expert", answer: "About 6 bags per m3.", is_expert: false, created_at: "2026-09-02T05:00:00Z", answerer: { full_name: "Expert", role: "user" } },
]

type TableSpec = { result: SupabaseResult<unknown>; callsRef: { current: ReturnType<typeof createQueryBuilder> | null } }

function makePerTableSupabase(tables: Record<string, TableSpec>) {
  const from = vi.fn((table: string) => {
    // The scores view is best-effort in the hook; tests that don't provide a
    // spec for it get an empty scoreboard.
    if (table === "v_tip_qa_scores" && !tables[table])
      return createQueryBuilder({ data: [], error: null }).builder
    const spec = tables[table]
    if (!spec) throw new Error(`unexpected table in test: ${table}`)
    const qb = createQueryBuilder(spec.result)
    spec.callsRef.current = qb
    return qb.builder
  })
  return { from }
}

/** Benign channel() default for tests that don't exercise realtime. */
function benignChannel() {
  const ch = { on: vi.fn(() => ch), subscribe: vi.fn(() => ch) }
  return vi.fn(() => ch)
}

async function loadHook(tables: Record<string, TableSpec>, channelOverride?: unknown) {
  const channel = channelOverride ?? benignChannel()
  mockSupabaseModule({ ...(makePerTableSupabase(tables) as object), channel, removeChannel: vi.fn(async () => {}) } as never)
  return await import("@/hooks/useTipQa")
}

beforeEach(() => {
  vi.resetModules()
})

/**
 * The mocked builders resolve on microtasks, so the load cycle's transient
 * isLoading=true never reaches a render — wait on resulting state instead.
 */
async function waitForReady(result: { current: { isLoading: boolean } }, ready: () => boolean) {
  await waitFor(() => expect(ready()).toBe(true))
  await waitFor(() => expect(result.current.isLoading).toBe(false))
}

describe("useTipQa data path", () => {
  it("loads questions and grouped answers and resolves the viewer's users.id", async () => {
    const users = { current: null }
    const questions = { current: null }
    const answers = { current: null }
    const { useTipQa } = await loadHook({
      users: { result: { data: [{ id: "u-me" }], error: null }, callsRef: users },
      tip_questions: { result: { data: QUESTIONS, error: null }, callsRef: questions },
      tip_answers: { result: { data: ANSWERS, error: null }, callsRef: answers },
    })

    const { result } = renderHook(() => useTipQa("tip1", "auth-uid-1"))

    await waitForReady(result, () => result.current.questions.length === 2)
    expect(result.current.error).toBeNull()
    expect(result.current.myUserId).toBe("u-me")
    expect(result.current.questions.map((q) => q.id)).toEqual(["q1", "q2"])
    expect(result.current.questions[0].asker_name).toBe("Me")
    // Answers nested by question, newest question first, answers oldest first
    expect(result.current.answers.q1.map((a) => a.id)).toEqual(["a2"])
    expect(result.current.answers.q2[0].is_expert).toBe(true)

    expect(users.current?.calls.find((c) => c.method === "eq")?.args).toEqual(["auth_uid", "auth-uid-1"])
    expect(questions.current?.calls.find((c) => c.method === "eq")?.args).toEqual(["tip_id", "tip1"])
    expect(questions.current?.calls.find((c) => c.method === "limit")?.args).toEqual([20])
    expect(answers.current?.calls.find((c) => c.method === "in")?.args).toEqual(["question_id", ["q1", "q2"]])
  })

  it("merges vote scores and the viewer's own vote from the scores view", async () => {
    const scores = { current: null }
    const { useTipQa } = await loadHook({
      users: { result: { data: [{ id: "u-me" }], error: null }, callsRef: { current: null } },
      tip_questions: { result: { data: QUESTIONS, error: null }, callsRef: { current: null } },
      tip_answers: { result: { data: ANSWERS, error: null }, callsRef: { current: null } },
      v_tip_qa_scores: {
        result: {
          data: [
            { question_id: "q1", answer_id: null, score: 3, my_value: 1 },
            { question_id: null, answer_id: "a2", score: -1, my_value: -1 },
          ],
          error: null,
        },
        callsRef: scores,
      },
    })
    const { result } = renderHook(() => useTipQa("tip1", "auth-uid-1"))
    await waitForReady(result, () => result.current.questions.length === 2)
    expect(result.current.questions.find((q) => q.id === "q1")?.score).toBe(3)
    expect(result.current.questions.find((q) => q.id === "q1")?.myVote).toBe(1)
    expect(result.current.questions.find((q) => q.id === "q2")?.score).toBe(0)
    const a2 = result.current.answers.q1?.find((a) => a.id === "a2")
    expect(a2?.score).toBe(-1)
    expect(a2?.myVote).toBe(-1)
    // Both targets are fetched through a single or() filter.
    expect(scores.current?.calls.find((c) => c.method === "or")?.args[0]).toContain("question_id.in.(q1,q2)")
    expect(scores.current?.calls.find((c) => c.method === "or")?.args[0]).toContain("answer_id.in.(a1,a2)")
  })

  it("surfaces a query error and clears state", async () => {
    const { useTipQa } = await loadHook({
      users: { result: { data: null, error: null }, callsRef: { current: null } },
      tip_questions: { result: { data: null, error: { message: "boom" } }, callsRef: { current: null } },
      tip_answers: { result: { data: [], error: null }, callsRef: { current: null } },
    })
    const { result } = renderHook(() => useTipQa("tip1", "auth-1"))
    await waitForReady(result, () => result.current.error === "boom")
    expect(result.current.error).toBe("boom")
    expect(result.current.questions).toEqual([])
    expect(result.current.answers).toEqual({})
  })

  it("skips the answers query when a tip has no questions", async () => {
    const from = vi.fn((table: string) => {
      if (table === "users") return createQueryBuilder({ data: [{ id: "u-me" }], error: null }).builder
      if (table === "tip_questions") return createQueryBuilder({ data: [], error: null }).builder
      throw new Error(`tip_answers must not be queried, got: ${table}`)
    })
    mockSupabaseModule({ from } as never)
    const { useTipQa } = await import("@/hooks/useTipQa")
    const { result } = renderHook(() => useTipQa("tip1", "auth-1"))
    // The users lookup resolves even with no questions — anchor on it.
    await waitForReady(result, () => result.current.myUserId === "u-me")
    expect(result.current.questions).toEqual([])
    expect(result.current.answers).toEqual({})
  })

  it("no-ops safely for a null tip id", async () => {
    const { useTipQa } = await loadHook({})
    const { result } = renderHook(() => useTipQa(null, "auth-1"))
    await waitForReady(result, () => result.current.questions.length === 0)
    expect(result.current.questions).toEqual([])
    expect(result.current.myUserId).toBeNull()
  })
})

describe("useTipQa optimistic voting", () => {
  function makeVoteHarness(rpcImpl: () => Promise<unknown>) {
    const rpc = vi.fn(rpcImpl)
    let questionFetches = 0
    const from = vi.fn((table: string) => {
      if (table === "v_tip_qa_scores") return createQueryBuilder({ data: [], error: null }).builder
      if (table === "users") return createQueryBuilder({ data: [{ id: "u-me" }], error: null }).builder
      if (table === "tip_questions") {
        questionFetches += 1
        return createQueryBuilder({ data: QUESTIONS, error: null }).builder
      }
      if (table === "tip_answers") return createQueryBuilder({ data: ANSWERS, error: null }).builder
      throw new Error(`unexpected table: ${table}`)
    })
    return { rpc, from, getFetches: () => questionFetches }
  }

  it("patches the score instantly, calls the RPC, and does not refetch on success", async () => {
    const harness = makeVoteHarness(async () => ({ data: { success: true }, error: null }))
    mockSupabaseModule({ from: harness.from, rpc: harness.rpc, channel: benignChannel(), removeChannel: vi.fn(async () => {}) } as never)
    const { useTipQa } = await import("@/hooks/useTipQa")
    const { result } = renderHook(() => useTipQa("tip1", "auth-1"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const fetchesBefore = harness.getFetches()

    let err: string | null = null
    await act(async () => {
      err = await result.current.applyOptimisticVote({ kind: "question", id: "q1" }, 1)
    })
    expect(err).toBeNull()
    expect(result.current.questions.find((q) => q.id === "q1")?.score).toBe(1)
    expect(result.current.questions.find((q) => q.id === "q1")?.myVote).toBe(1)
    expect(harness.rpc).toHaveBeenCalledWith("vote_tip_qa", {
      p_value: 1,
      p_question_id: "q1",
      p_answer_id: null,
    })
    expect(harness.getFetches()).toBe(fetchesBefore) // optimistic: no refetch

    // Same value again toggles the vote off.
    await act(async () => {
      err = await result.current.applyOptimisticVote({ kind: "question", id: "q1" }, 1)
    })
    expect(result.current.questions.find((q) => q.id === "q1")?.score).toBe(0)
    expect(result.current.questions.find((q) => q.id === "q1")?.myVote).toBeNull()
  })

  it("reverts to server truth when the RPC fails", async () => {
    const harness = makeVoteHarness(async () => ({ data: null, error: { message: "db down" } }))
    mockSupabaseModule({ from: harness.from, rpc: harness.rpc, channel: benignChannel(), removeChannel: vi.fn(async () => {}) } as never)
    const { useTipQa } = await import("@/hooks/useTipQa")
    const { result } = renderHook(() => useTipQa("tip1", "auth-1"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let err: string | null = null
    await act(async () => {
      err = await result.current.applyOptimisticVote({ kind: "answer", id: "a1" }, 1)
    })
    expect(err).toBe("db down")
    // The failure triggers a refetch; server truth has no votes recorded.
    await waitFor(() => {
      const a1 = result.current.answers.q2?.find((a) => a.id === "a1")
      expect(a1?.score).toBe(0)
      expect(a1?.myVote).toBeNull()
    })
  })
})

describe("useTipQa realtime", () => {
  function makeChannelStub() {
    const handlers: Array<{ table: string; cb: () => void }> = []
    let subscribed = 0
    const channel = {
      on: vi.fn((_event: string, config: { table: string }, cb: () => void) => {
        handlers.push({ table: config.table, cb })
        return channel
      }),
      subscribe: vi.fn(() => {
        subscribed += 1
        return channel
      }),
    }
    return { channel, handlers, isSubscribed: () => subscribed === 1 }
  }

  it("subscribes to question/answer changes and refetches (debounced) on events", async () => {
    const stub = makeChannelStub()
    let questionFetches = 0
    const from = vi.fn((table: string) => {
      if (table === "users") return createQueryBuilder({ data: [{ id: "u-me" }], error: null }).builder
      if (table === "tip_questions") {
        questionFetches += 1
        return createQueryBuilder({ data: QUESTIONS, error: null }).builder
      }
      if (table === "tip_answers") return createQueryBuilder({ data: ANSWERS, error: null }).builder
      throw new Error(`unexpected table: ${table}`)
    })
    mockSupabaseModule({ from, channel: vi.fn(() => stub.channel), removeChannel: vi.fn(async () => {}) } as never)
    const { useTipQa } = await import("@/hooks/useTipQa")

    const { result, unmount } = renderHook(() => useTipQa("tip1", "auth-1"))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(stub.isSubscribed()).toBe(true)
    expect(stub.handlers.map((h) => h.table).sort()).toEqual(["tip_answers", "tip_qa_votes", "tip_questions"])
    const fetchesAfterLoad = questionFetches

    // Fire both channels back-to-back: the 300ms debounce collapses them
    // into a single refetch.
    act(() => {
      stub.handlers.forEach((h) => h.cb())
    })
    await new Promise((r) => setTimeout(r, 450))
    await waitFor(() => expect(questionFetches).toBe(fetchesAfterLoad + 1))

    unmount()
  })

  it("removes the channel on unmount", async () => {
    const stub = makeChannelStub()
    const removeChannel = vi.fn(async () => {})
    const from = vi.fn((table: string) =>
      createQueryBuilder({ data: table === "tip_questions" ? QUESTIONS : table === "tip_answers" ? ANSWERS : [{ id: "u-me" }], error: null }).builder
    )
    mockSupabaseModule({ from, channel: vi.fn(() => stub.channel), removeChannel } as never)
    const { useTipQa } = await import("@/hooks/useTipQa")
    const { unmount } = renderHook(() => useTipQa("tip1", "auth-1"))
    await waitFor(() => expect(stub.isSubscribed()).toBe(true))
    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(1)
  })
})
