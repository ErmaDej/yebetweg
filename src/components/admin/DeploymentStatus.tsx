import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Injected at build time (vite.config `define`) — identifies exactly which
// commit this running bundle was built from.
declare const __COMMIT_SHA__: string

interface DeployInfo {
  commit: string
  deployment_id: string
  url?: string
  ready_at?: number
  files_total?: number
  files_uploaded?: number
  files_unchanged?: number
  bytes?: number
}

function shortSha(sha: string | undefined): string {
  return sha ? sha.slice(0, 7) : "?"
}

export function DeploymentStatus() {
  const [info, setInfo] = useState<DeployInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "deploy_info")
        .maybeSingle()
      if (cancelled) return
      if (err) setError(err.message)
      else setInfo((data?.value as DeployInfo) ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const running = shortSha(__COMMIT_SHA__)
  const deployed = shortSha(info?.commit)
  const synced = !!info && info.commit === __COMMIT_SHA__

  let stateBadge: React.ReactNode
  if (error) {
    stateBadge = <Badge variant="destructive">unreadable</Badge>
  } else if (!info) {
    stateBadge = <Badge variant="secondary">no deploy recorded yet</Badge>
  } else if (synced) {
    stateBadge = <Badge className="bg-emerald-600">up to date</Badge>
  } else {
    stateBadge = <Badge variant="destructive">stale — redeploy needed</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Deployment Status {stateBadge}
        </CardTitle>
        <CardDescription>
          Whether the live Vercel build matches the code this admin session runs.
          Recorded automatically by <code>scripts/deploy-vercel-rest.py</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {error && <p className="text-destructive">{error}</p>}
        {!error && (
          <>
            <p>
              <span className="text-muted-foreground">Running bundle:</span>{" "}
              <code>{running}</code>
              {!synced && info && " (this session)"}
            </p>
            {info ? (
              <>
                <p>
                  <span className="text-muted-foreground">Last deploy:</span>{" "}
                  <code>{deployed}</code>
                  {info.ready_at
                    ? ` · ${new Date(info.ready_at).toLocaleString()}`
                    : ""}
                </p>
                {info.url && (
                  <p>
                    <span className="text-muted-foreground">Deployment:</span>{" "}
                    <a
                      className="underline"
                      href={`https://${info.url}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {info.url}
                    </a>
                  </p>
                )}
                {typeof info.files_total === "number" && (
                  <p className="text-muted-foreground">
                    {info.files_total} files ({info.files_uploaded ?? "?"} uploaded,{" "}
                    {info.files_unchanged ?? "?"} unchanged)
                    {typeof info.bytes === "number"
                      ? ` · ${(info.bytes / 1e6).toFixed(1)} MB`
                      : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Run the deploy script once to record the live deployment.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
