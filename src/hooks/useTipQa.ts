import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

// ============================================================================
// Tip Q&A — StackOverflow-style questions & answers on Construction Tips
// ============================================================================
// Tables/RPCs live in 20260922010000_tip_questions_answers.sql (+ hardening in
// 20260924000000) and 20260924130000_tip_qa_replies_and_votes.sql. Reads use
// direct selects (RLS: signed-in read-all); writes go through the RPCs so
// validation + caps + expert-badge logic stay server-side.
//
// Threading: an answer with parent_answer_id is a reply to a top-level answer
// (one nesting level — the RPC rejects reply-to-reply and cross-question).
// Votes: tip_qa_votes (+1/−1, one per user per target, toggled via the
// vote_tip_qa RPC); scores + the viewer's own vote come from v_tip_qa_scores.

export type TipQuestion = {
  id: string
  tip_id: string
  user_id: string
  question: string
  created_at: string
  /** Vote balance (ups − downs); 0 when nobody has voted. */
  score: number
  /** The signed-in viewer's own vote: 1, −1 or null. */
  myVote: 1 | -1 | null
  /** Joined display fields (alias_* selects), not columns. */
  asker_name?: string | null
  asker_role?: string | null
}

export type TipAnswer = {
  id: string
  question_id: string
  /** Set when this answer is a reply to another answer of the same question. */
  parent_answer_id: string | null
  user_id: string
  answer: string
  is_expert: boolean
  created_at: string
  score: number
  myVote: 1 | -1 | null
  answerer_name?: string | null
  answerer_role?: string | null
}

const QUESTION_SELECT = "id, tip_id, user_id, question, created_at, asker:users(full_name, role)"
const ANSWER_SELECT =
  "id, question_id, parent_answer_id, user_id, answer, is_expert, created_at, answerer:users(full_name, role)"

function mapQuestion(row: Record<string, unknown>): TipQuestion {
  const u = (row.asker ?? {}) as { full_name?: string | null; role?: string | null }
  return {
    id: row.id as string,
    tip_id: row.tip_id as string,
    user_id: row.user_id as string,
    question: row.question as string,
    created_at: row.created_at as string,
    score: 0,
    myVote: null,
    asker_name: u.full_name ?? null,
    asker_role: u.role ?? null,
  }
}

function mapAnswer(row: Record<string, unknown>): TipAnswer {
  const u = (row.answerer ?? {}) as { full_name?: string | null; role?: string | null }
  return {
    id: row.id as string,
    question_id: row.question_id as string,
    parent_answer_id: (row.parent_answer_id as string | null) ?? null,
    user_id: row.user_id as string,
    answer: row.answer as string,
    is_expert: Boolean(row.is_expert),
    created_at: row.created_at as string,
    score: 0,
    myVote: null,
    answerer_name: u.full_name ?? null,
    answerer_role: u.role ?? null,
  }
}

/** Answers render newest-first within each score band (good answers surface). */
function sortAnswers(list: TipAnswer[]): TipAnswer[] {
  return [...list].sort((a, b) => (b.score - a.score) || b.created_at.localeCompare(a.created_at))
}

/**
 * Questions (with threaded answers) + vote scores for one tip.
 * Empty until the migrations are applied — degrade gracefully.
 */
export function useTipQa(
  tipId: string | null,
  authUid: string | null = null,
  /** When false, skip fetching + realtime (used by the collapsed teaser vs open dialog). */
  enabled = true,
) {
  const [questions, setQuestions] = useState<TipQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, TipAnswer[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** The signed-in viewer's users.id — used by the UI to show delete only on own questions. */
  const [myUserId, setMyUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tipId || !enabled) {
      setQuestions([])
      setAnswers({})
      setMyUserId(null)
      return
    }

    // Resolve the viewer's users.id (questions reference users.id, not auth.uid).
    // Failure here only disables the delete affordance, not Q&A itself.
    if (authUid) {
      try {
        const meRes = await supabase.from("users").select("id").eq("auth_uid", authUid).maybeSingle()
        // Tolerate both object and array-shaped rows (PostgREST/proxy variance).
        const me = Array.isArray(meRes.data) ? meRes.data[0] : meRes.data
        setMyUserId((me as { id: string } | null)?.id ?? null)
      } catch {
        setMyUserId(null)
      }
    } else {
      setMyUserId(null)
    }
    setIsLoading(true)
    setError(null)
    try {
      const qRes = await supabase
        .from("tip_questions")
        .select(QUESTION_SELECT)
        .eq("tip_id", tipId)
        .order("created_at", { ascending: false })
        .limit(20)
      if (qRes.error) throw qRes.error
      const qs = (qRes.data ?? []).map(mapQuestion)

      let answerList: TipAnswer[] = []
      if (qs.length > 0) {
        const aRes = await supabase
          .from("tip_answers")
          .select(ANSWER_SELECT)
          .in("question_id", qs.map((q) => q.id))
          .order("created_at", { ascending: true })
        if (aRes.error) throw aRes.error
        answerList = (aRes.data ?? []).map(mapAnswer)
      }

      // Vote scores + the viewer's own vote, in one view round-trip. Best-effort:
      // if the view doesn't exist yet (migration pending), the thread still renders.
      let scores: Record<string, { score: number; my: 1 | -1 | null }> = {}
      // PostgREST ANDs separate .in() filters, so both targets must go through
      // one .or() — question votes have a null answer_id and vice versa.
      const orParts: string[] = []
      if (qs.length > 0) orParts.push(`question_id.in.(${qs.map((q) => q.id).join(",")})`)
      if (answerList.length > 0) orParts.push(`answer_id.in.(${answerList.map((a) => a.id).join(",")})`)
      if (orParts.length > 0) {
        const sRes = await supabase
          .from("v_tip_qa_scores")
          .select("question_id, answer_id, score, my_value")
          .or(orParts.join(","))
        if (!sRes.error) {
          scores = Object.fromEntries(
            (sRes.data ?? []).map((r: Record<string, unknown>) => {
              const key = (r.answer_id as string | null) ?? (r.question_id as string | null) ?? ""
              return [
                key,
                {
                  score: Number(r.score ?? 0),
                  my: r.my_value === 1 ? 1 : r.my_value === -1 ? -1 : null,
                },
              ]
            }),
          )
        }
      }

      for (const q of qs) {
        const s = scores[q.id]
        if (s) {
          q.score = s.score
          q.myVote = s.my
        }
      }
      for (const a of answerList) {
        const s = scores[a.id]
        if (s) {
          a.score = s.score
          a.myVote = s.my
        }
      }

      setQuestions(qs)
      const grouped: Record<string, TipAnswer[]> = {}
      for (const a of answerList) {
        grouped[a.question_id] = [...(grouped[a.question_id] ?? []), a]
      }
      // Replies must render right after their parent; sort top-level and replies separately.
      for (const key of Object.keys(grouped)) {
        grouped[key] = sortAnswers(grouped[key])
      }
      setAnswers(grouped)
    } catch (e) {
      // Supabase query errors are plain objects (not Error instances), so
      // extract the message from either shape — surfacing the server's real
      // reason (e.g. permission denied) beats a generic fallback.
      const message = e instanceof Error ? e.message : (e as { message?: string } | null)?.message
      setError(message ?? "Could not load Q&A")
      setQuestions([])
      setAnswers({})
    } finally {
      setIsLoading(false)
    }
  }, [tipId, authUid, enabled])

  useEffect(() => {
    if (enabled) void load()
  }, [load, enabled])

  // ------------------------------------------------------------------ realtime
  // Live updates without manual reload: postgres_changes events on the three
  // tables trigger a debounced refetch (queries stay the source of truth, so
  // RLS still applies to every row we render). Answers have no tip_id column
  // to filter on server-side, so those channels are global — the debounce
  // keeps a burst of events to a single refetch.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (!tipId || !enabled) return
    // Realtime is optional: guard so test doubles without .channel() no-op.
    if (typeof (supabase as { channel?: unknown }).channel !== "function") return

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void loadRef.current(), 300)
    }

    const channel = supabase
      .channel(`tip-qa-${tipId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tip_questions", filter: `tip_id=eq.${tipId}` },
        scheduleReload,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tip_answers" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tip_qa_votes" }, scheduleReload)
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [tipId])

  /**
   * Optimistic vote: patches the local score/myVote immediately (add, flip,
   * or toggle-off), fires the RPC, and only on failure refetches to revert.
   * On success no refetch is needed — the optimistic state IS the server
   * state; other users' votes arrive via the realtime channel.
   */
  const applyOptimisticVote = useCallback(
    async (
      target: { kind: "question" | "answer"; id: string },
      value: 1 | -1,
    ): Promise<string | null> => {
      const patch = (
        prevScore: number,
        prevVote: 1 | -1 | null,
      ): { score: number; myVote: 1 | -1 | null } => {
        if (prevVote === value) return { score: prevScore - value, myVote: null }
        if (prevVote === null) return { score: prevScore + value, myVote: value }
        return { score: prevScore + 2 * value, myVote: value }
      }

      if (target.kind === "question") {
        setQuestions((qs) =>
          qs.map((q) => {
            if (q.id !== target.id) return q
            const next = patch(q.score, q.myVote)
            return { ...q, score: next.score, myVote: next.myVote }
          }),
        )
      } else {
        setAnswers((map) => {
          const nextMap: Record<string, TipAnswer[]> = {}
          for (const [qid, list] of Object.entries(map)) {
            nextMap[qid] = sortAnswers(
              list.map((a) =>
                a.id === target.id ? { ...a, ...patch(a.score, a.myVote) } : a,
              ),
            )
          }
          return nextMap
        })
      }

      const err = await voteTipQa(target, value)
      if (err) void load() // revert from server truth
      return err
    },
    [load],
  )

  return { questions, answers, isLoading, error, myUserId, reload: load, applyOptimisticVote }
}

/** Ask a question via the capped RPC. Returns error message or null on success. */
export async function askTipQuestion(tipId: string, question: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("ask_tip_question", {
    p_tip_id: tipId,
    p_question: question,
  })
  const result = (data ?? {}) as { success?: boolean; error?: string }
  if (error) return error.message
  return result.success ? null : (result.error ?? "Could not post your question.")
}

/** Answer a question — or reply to an answer (p_parent_answer_id). */
export async function answerTipQuestion(
  questionId: string,
  answer: string,
  parentAnswerId: string | null = null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("answer_tip_question", {
    p_question_id: questionId,
    p_answer: answer,
    ...(parentAnswerId ? { p_parent_answer_id: parentAnswerId } : {}),
  })
  const result = (data ?? {}) as { success?: boolean; error?: string }
  if (error) return error.message
  return result.success ? null : (result.error ?? "Could not post your answer.")
}

/**
 * Up/down vote a question or answer. Same value toggles the vote off,
 * opposite flips it (server-side via vote_tip_qa). Returns error message or null.
 */
export async function voteTipQa(
  target: { kind: "question" | "answer"; id: string },
  value: 1 | -1,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("vote_tip_qa", {
    p_value: value,
    p_question_id: target.kind === "question" ? target.id : null,
    p_answer_id: target.kind === "answer" ? target.id : null,
  })
  const result = (data ?? {}) as { success?: boolean; error?: string }
  if (error) return error.message
  return result.success ? null : (result.error ?? "Could not record your vote.")
}

/** Delete own question (cascade-deletes its answers). */
export async function deleteTipQuestion(questionId: string): Promise<string | null> {
  const { error } = await supabase.from("tip_questions").delete().eq("id", questionId)
  return error ? error.message : null
}
