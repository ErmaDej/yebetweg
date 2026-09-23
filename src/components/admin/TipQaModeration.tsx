import { useCallback, useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, RefreshCw, Search, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/i18n"
import { ConfirmActionDialog } from "@/components/admin/ConfirmActionDialog"

type PendingDelete = {
  kind: "question" | "answer"
  id: string
  label: string
}

type QuestionRow = {
  id: string
  tip_id: string
  question: string
  created_at: string
  asker?: { full_name?: string | null } | null
  tip?: { title_en?: string | null; title_am?: string | null } | null
}

type AnswerRow = {
  id: string
  question_id: string
  answer: string
  is_expert: boolean
  created_at: string
  answerer?: { full_name?: string | null } | null
}

const QUESTIONS_SELECT =
  "id, tip_id, question, created_at, asker:users(full_name), tip:tips(title_en, title_am)"
const ANSWERS_SELECT =
  "id, question_id, answer, is_expert, created_at, answerer:users(full_name)"

/**
 * Admin moderation for tip Q&A: review the latest questions and answers,
 * search by content/author, and delete abusive rows. Deletes go through
 * plain client calls — RLS ("Admins delete any …") authorizes admins only.
 * Deleting a question cascade-deletes its answers.
 */
export function TipQaModeration() {
  const { language } = useLanguage()
  const am = language === "am"

  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [qRes, aRes] = await Promise.all([
        supabase.from("tip_questions").select(QUESTIONS_SELECT).order("created_at", { ascending: false }).limit(100),
        supabase.from("tip_answers").select(ANSWERS_SELECT).order("created_at", { ascending: false }).limit(200),
      ])
      if (qRes.error) throw qRes.error
      if (aRes.error) throw aRes.error
      setQuestions((qRes.data ?? []) as unknown as QuestionRow[])
      setAnswers((aRes.data ?? []) as unknown as AnswerRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : am ? "መጫን አልተቻለም።" : "Could not load Q&A.")
    } finally {
      setLoading(false)
    }
  }, [am])

  useEffect(() => {
    void load()
  }, [load])

  const answersByQuestion = useMemo(() => {
    const map = new Map<string, AnswerRow[]>()
    for (const a of answers) map.set(a.question_id, [...(map.get(a.question_id) ?? []), a])
    return map
  }, [answers])

  const term = search.trim().toLowerCase()
  const visibleQuestions = useMemo(() => {
    if (!term) return questions
    return questions.filter((q) => {
      const hay = [
        q.question,
        q.asker?.full_name ?? "",
        q.tip?.title_en ?? "",
        q.tip?.title_am ?? "",
        ...(answersByQuestion.get(q.id) ?? []).map((a) => a.answer),
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(term)
    })
  }, [questions, term, answersByQuestion])

  const runDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const table = pendingDelete.kind === "question" ? "tip_questions" : "tip_answers"
      const { error: delError } = await supabase.from(table).delete().eq("id", pendingDelete.id)
      if (delError) throw delError
      setPendingDelete(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : am ? "መሰረዝ አልተቻለም።" : "Delete failed.")
      setPendingDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={am ? "ጥያቄ፣ መልስ ወይም ደራሲ ይፈልጉ…" : "Search questions, answers, or authors…"}
            className="pl-8"
            aria-label={am ? "መፈለጊያ" : "Search Q&A"}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          {am ? "እየሆነ" : "Refresh"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {am
          ? `${questions.length} ጥያቄዎች · ${answers.length} መልሶች (የቅርብ ጊዜያት)`
          : `${questions.length} questions · ${answers.length} answers (most recent)`}
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {am ? "በመጫን ላይ…" : "Loading…"}
        </div>
      ) : visibleQuestions.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          {term ? (am ? "ውጤት አልተገኘም።" : "No matches.") : am ? "ጥያቄ የለም።" : "No questions yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleQuestions.map((q) => (
            <div key={q.id} className="rounded-md border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug break-words">{q.question}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {q.asker?.full_name || (am ? "አባል" : "Member")} ·{" "}
                    {am ? q.tip?.title_am || q.tip?.title_en || "ምክር" : q.tip?.title_en || q.tip?.title_am || "Tip"}{" "}
                    · {new Date(q.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label={am ? "ጥያቄ ሰርዝ" : "Delete question"}
                  onClick={() =>
                    setPendingDelete({
                      kind: "question",
                      id: q.id,
                      label: q.question.length > 80 ? `${q.question.slice(0, 80)}…` : q.question,
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {(answersByQuestion.get(q.id)?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1.5 border-l-2 border-primary/30 pl-3">
                  {(answersByQuestion.get(q.id) ?? []).map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground leading-snug break-words">
                          {a.answer}
                          {a.is_expert && (
                            <Badge className="ml-1.5 text-[10px]" variant="secondary">
                              {am ? "ናሙና መልስ" : "Expert"}
                            </Badge>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {a.answerer?.full_name || (am ? "አባል" : "Member")} ·{" "}
                          {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-destructive hover:text-destructive"
                        aria-label={am ? "መልስ ሰርዝ" : "Delete answer"}
                        onClick={() =>
                          setPendingDelete({
                            kind: "answer",
                            id: a.id,
                            label: a.answer.length > 80 ? `${a.answer.slice(0, 80)}…` : a.answer,
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={
          pendingDelete?.kind === "question"
            ? am ? "ጥያቄ ይሰረዝ?" : "Delete this question?"
            : am ? "መልስ ይሰረዝ?" : "Delete this answer?"
        }
        description={
          pendingDelete?.kind === "question"
            ? am
              ? `ይሄ እርምጃ መልሶቹንም ያስወግዳል። «${pendingDelete?.label ?? ""}»`
              : `This also removes all of its answers. "${pendingDelete?.label ?? ""}"`
            : am
              ? `«${pendingDelete?.label ?? ""}»`
              : `"${pendingDelete?.label ?? ""}"`
        }
        confirmLabel={am ? "ሰርዝ" : "Delete"}
        busy={deleting}
        onConfirm={() => void runDelete()}
      />
    </div>
  )
}
