import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface JobRow {
  jobname: string
  schedule: string
  active: boolean
  runs: number
  failures: number
  last_run: string | null
}

interface ResponseRow {
  id: number
  created: string
  status_code: number
  timed_out: boolean
  error_msg: string | null
  content_head: string | null
}

interface AlertRow {
  kind: "job_inactive" | "sql_failed" | "http_timed_out" | "http_error" | "no_response"
  jobname?: string
  at?: string
  status?: number
  detail?: string
}

interface CronHealth {
  ok: boolean
  error?: string
  window_hours: number
  generated_at: string
  jobs: JobRow[]
  recent_responses: ResponseRow[]
  alerts: AlertRow[]
}

const KIND_LABEL: Record<AlertRow["kind"], string> = {
  job_inactive: "job disabled",
  sql_failed: "SQL failure",
  http_timed_out: "HTTP timeout (call abandoned)",
  http_error: "non-2xx reply",
  no_response: "fire completed, no reply received",
}

/**
 * Admin view of scheduled-job health: cron runs, the edge functions' actual
 * HTTP replies (pg_net), and actionable alerts. Built after the 2026-09-25
 * incident where a daily cron "succeeded" while pg_net had abandoned the call
 * at its 5s default timeout — cron.job_run_details alone proves nothing.
 */
export function CronHealth() {
  const [health, setHealth] = useState<CronHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState(36)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const load = useCallback(async (h: number) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.rpc("admin_cron_health", {
      p_window_hours: h,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    const parsed = data as CronHealth | null
    if (!parsed?.ok) setError(parsed?.error ?? "Unknown error")
    else setHealth(parsed)
  }, [])

  useEffect(() => {
    load(hours)
  }, [load, hours])

  const alerts = health?.alerts ?? []
  const jobs = health?.jobs ?? []
  const responses = health?.recent_responses ?? []

  const badge = loading ? (
    <Badge variant="secondary">checking…</Badge>
  ) : error ? (
    <Badge variant="destructive">unreadable</Badge>
  ) : alerts.length > 0 ? (
    <Badge variant="destructive">{alerts.length} alert{alerts.length > 1 ? "s" : ""}</Badge>
  ) : (
    <Badge className="bg-emerald-600">healthy</Badge>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Scheduled Jobs (Cron) Health {badge}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={() => load(hours)}
            disabled={loading}
            aria-label="Refresh cron health"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Cron runs, the functions' actual HTTP replies, and failures a human must
          act on. "Succeeded" in cron only means the SQL block ran — this view also
          checks that pg_net got an answer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Window:</span>
          {[6, 36, 168].map((h) => (
            <Button
              key={h}
              variant={hours === h ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setHours(h)}
            >
              {h < 24 ? `${h}h` : `${h / 24}d`}
            </Button>
            ))}
          {health && (
            <span className="ml-auto text-xs text-muted-foreground">
              as of {health.generated_at}
            </span>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!error && (
          <>
            {alerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Needs attention</p>
                {alerts.map((a, i) => (
                  <div
                    key={`${a.kind}-${a.at ?? i}-${i}`}
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-sm"
                  >
                    <p className="font-medium">
                      {KIND_LABEL[a.kind]}
                      {a.jobname ? ` — ${a.jobname}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.at ? `${new Date(a.at).toLocaleString()} · ` : ""}
                      {a.status ? `HTTP ${a.status} · ` : ""}
                      {a.detail ?? ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">Job</th>
                    <th className="py-1.5 pr-3 font-medium">Schedule</th>
                    <th className="py-1.5 pr-3 font-medium">Runs</th>
                    <th className="py-1.5 pr-3 font-medium">Last run</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.jobname} className="border-b last:border-0">
                      <td className="py-1.5 pr-3">
                        <code className="text-xs">{j.jobname}</code>
                        {!j.active && <Badge variant="secondary" className="ml-2 text-[10px]">disabled</Badge>}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-xs">{j.schedule}</td>
                      <td className="py-1.5 pr-3">
                        {j.runs}
                        {j.failures > 0 && (
                          <span className="text-destructive"> ({j.failures} failed)</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-xs">
                        {j.last_run ? new Date(j.last_run).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-2 text-muted-foreground">
                        No cron jobs exist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {responses.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium">Recent function replies ({responses.length})</p>
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {responses.map((r) => {
                    const bad = r.timed_out || !(r.status_code >= 200 && r.status_code < 300)
                    return (
                      <div key={r.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-muted/60"
                          onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}
                        >
                          <Badge
                            variant={bad ? "destructive" : "secondary"}
                            className="shrink-0 font-mono"
                          >
                            {r.timed_out ? "TIMEOUT" : `HTTP ${r.status_code}`}
                          </Badge>
                          <span className="text-muted-foreground">{new Date(r.created).toLocaleString()}</span>
                          {!r.error_msg && r.content_head && !expanded[r.id] && (
                            <span className="truncate text-muted-foreground">{r.content_head}</span>
                          )}
                        </button>
                        {expanded[r.id] && (
                          <pre className="mx-1.5 mb-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[11px]">
                            {r.error_msg || r.content_head || "(no body)"}
                          </pre>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
