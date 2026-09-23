import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

// ============================================================================
// Tip Q&A — StackOverflow-style questions & answers on Construction Tips
// ============================================================================
// Tables/RPCs live in 20260922010000_tip_questions_answers.sql. Reads use
// direct selects (RLS: signed-in read-all); writes go through the RPCs so
// validation + caps + expert-badge logic stay server-side.

export type TipQuestion = {
  id: string
  tip_id: string
  user_id: string
  question: string
  created_at: string
  /** Joined display fields (alias_* selects), not columns. */
  asker_name?: string | null
  asker_role?: string | null
}

export type TipAnswer = {
  id: string
  question_id: string
  user_id: string
  answer: string
  is_expert: boolean
  created_at: string
  answerer_name?: string | null
  answerer_role?: string | null
}

const QUESTION_SELECT = "id, tip_id, user_id, question, created_at, asker:users(full_name, role)"
const ANSWER_SELECT = "id, question_id, user_id, answer, is_expert, created_at, answerer:users(full_name, role)"

function mapQuestion(row: Record<string, unknown>): TipQuestion {
  const u = (row.asker ?? {}) as { full_name?: string | null; role?: string | null }
  return {
    id: row.id as string,
    tip_id: row.tip_id as string,
    user_id: row.user_id as string,
    question: row.question as string,
    created_at: row.created_at as string,
    asker_name: u.full_name ?? null,
    asker_role: u.role ?? null,
  }
}

function mapAnswer(row: Record<string, unknown>): TipAnswer {
  const u = (row.answerer ?? {}) as { full_name?: string | null; role?: string | null }
  return {
    id: row.id as string,
    question_id: row.question_id as string,
    user_id: row.user_id as string,
    answer: row.answer as string,
    is_expert: Boolean(row.is_expert),
    created_at: row.created_at as string,
    answerer_name: u.full_name ?? null,
    answerer_role: u.role ?? null,
  }
}

/** Questions (with answers nested) for one tip. Empty until the migration is applied. */
export function useTipQa(tipId: string | null, authUid: string | null = null) {
  const [questions, setQuestions] = useState<TipQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, TipAnswer[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** The signed-in viewer's users.id — used by the UI to show delete only on own questions. */
  const [myUserId, setMyUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tipId) {
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
      setQuestions(qs)

      if (qs.length > 0) {
        const aRes = await supabase
          .from("tip_answers")
          .select(ANSWER_SELECT)
          .in("question_id", qs.map((q) => q.id))
          .order("created_at", { ascending: true })
        if (aRes.error) throw aRes.error
        const grouped: Record<string, TipAnswer[]> = {}
        for (const row of aRes.data ?? []) {
          const a = mapAnswer(row as Record<string, unknown>)
          grouped[a.question_id] = [...(grouped[a.question_id] ?? []), a]
        }
        setAnswers(grouped)
      } else {
        setAnswers({})
      }
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
  }, [tipId, authUid])

  useEffect(() => {
    void load()
  }, [load])

  // ------------------------------------------------------------------ realtime
  // Live updates without manual reload: postgres_changes events on both tables
  // trigger a debounced refetch (queries stay the source of truth, so RLS still
  // applies to every row we render). Answers have no tip_id column to filter
  // on server-side, so the answers channel is global — the debounce keeps a
  // burst of events to a single refetch.
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (!tipId) return
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tip_answers" },
        scheduleReload,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [tipId])

  return { questions, answers, isLoading, error, myUserId, reload: load }
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

/** Answer a question via the RPC. Returns error message or null on success. */
export async function answerTipQuestion(questionId: string, answer: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("answer_tip_question", {
    p_question_id: questionId,
    p_answer: answer,
  })
  const result = (data ?? {}) as { success?: boolean; error?: string }
  if (error) return error.message
  return result.success ? null : (result.error ?? "Could not post your answer.")
}

/** Delete own question (cascade-deletes its answers). */
export async function deleteTipQuestion(questionId: string): Promise<string | null> {
  const { error } = await supabase.from("tip_questions").delete().eq("id", questionId)
  return error ? error.message : null
}
