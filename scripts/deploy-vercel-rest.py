#!/usr/bin/env python3
"""Deploy yebetweg to Vercel production via REST API.

The Vercel CLI's bulk upload kept aborting on this machine's connection, so
this uploads files ONE PER REQUEST to /v2/files with retries (several small
requests survive a flaky network better than one bulk request), then creates
the production deployment referencing the uploaded SHAs. Vercel builds
remotely with the project's configured env vars.

Contract notes (learned the hard way — see checklist §1a):
- POST /v2/files takes ONE raw file per request; its sha1 goes in the
  `x-vercel-digest` header. No multipart mode. 409 = already uploaded (fine).
- POST /v13/deployments references files as {sha, file, size}.
- Everything the remote build touches must be in the upload:
  scripts/generate-sitemap.js runs inside `npm run build`; public/ media is
  served as static assets. Only pure-doc trees are skipped.

Usage:
  set -a; . ./.env            # SUPABASE_URL + service key for deploy_info
  VERCEL_TOKEN=<token> python3 scripts/deploy-vercel-rest.py [--dry-run]

--dry-run: hash and classify every file, report what WOULD be sent, then
exit without touching Vercel (per-file uploaded/unchanged counts are only
knowable during a real send).

After a successful deploy the script records the deployment in
app_settings under `deploy_info` (id, url, commit, counts) — the admin
Deployment Status card reads this to detect a stale live site.
"""
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

DRY_RUN = "--dry-run" in sys.argv


def _load_dotenv(path: str = ".env") -> None:
    """Populate os.environ from a dotenv file without clobbering existing vars.

    Detached launches (setsid/nohup) don't inherit an interactive shell's
    exported env — the reason two deploys in a row skipped the deploy_info
    write. Loading ./.env directly makes the script self-sufficient.
    """
    try:
        for line in open(path, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)
    except FileNotFoundError:
        pass


_load_dotenv()

TOKEN = os.environ["VERCEL_TOKEN"]
TEAM = "team_LAY5zmGkqFZX0dBHV6AHlCTh"
PROJECT = "yebetweg"
BASE = "https://api.vercel.com"

# Where the deploy state is recorded for the in-app status card.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


def request(path, data=None, headers=None, method=None, timeout=180):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Authorization": f"Bearer {TOKEN}", **(headers or {})},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode()


def upload_one(_path, content, digest):
    """POST /v2/files: the body is the raw file content and its sha1 rides
    in the `x-vercel-digest` header. 409 = already uploaded, which is
    success for our purposes."""
    for i in range(3):
        try:
            status, _ = request(
                "/v2/files",
                data=content,
                headers={"Content-Type": "application/octet-stream", "x-vercel-digest": digest},
                method="POST",
                timeout=300,
            )
            return True, "uploaded"
        except urllib.error.HTTPError as e:
            if e.code == 409:
                return True, "unchanged"  # already uploaded = fine
            return False, f"HTTP {e.code}: {e.read().decode()[:200]}"
        except Exception as e:
            if i == 2:
                return False, f"{type(e).__name__}: {e}"
            time.sleep(2 * (i + 1))


def with_retries(fn, attempts=3):
    for i in range(attempts):
        ok, info = fn()
        if ok:
            return True, info
        print(f"    attempt {i + 1} failed: {info}")
        time.sleep(2 * (i + 1))
    return False, info


def record_deploy_info(dep, uploaded, unchanged, total, bytes_sent):
    """Best-effort: write the deployment to app_settings (key `deploy_info`)
    so the admin Deployment Status card can detect a stale live site.
    Never fails the deploy."""
    if DRY_RUN:
        return
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("note: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — deploy_info not recorded")
        return
    try:
        commit = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
        row = {
            "key": "deploy_info",
            "value": {
                "commit": commit,
                "deployment_id": dep["id"],
                "url": dep.get("url"),
                "ready_at": dep.get("ready"),
                "files_total": total,
                "files_uploaded": uploaded,
                "files_unchanged": unchanged,
                "bytes": bytes_sent,
            },
        }
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/app_settings?on_conflict=key",
            data=json.dumps(row).encode(),
            headers={
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "apikey": SUPABASE_SERVICE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as r:
            print(f"deploy_info recorded in app_settings (HTTP {r.status})")
    except Exception as e:
        print(f"note: could not record deploy_info: {e}")


def main():
    # Tracked AND untracked-but-not-ignored files: the working tree carries
    # new source files (hooks, components, tests) that git doesn't track yet,
    # but the remote build needs them.
    files = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"], text=True
    ).splitlines()
    # Pure-doc trees don't influence the Vite build — excluding them keeps
    # the upload small. Everything the remote build touches MUST stay: e.g.
    # scripts/generate-sitemap.js runs inside `npm run build`, and public/
    # media is served as static assets. node_modules/dist/.env are already
    # out via gitignore rules (ls-files --exclude-standard).
    SKIP_PREFIXES = ("Ref/", "memory/", "docs/", ".github/")
    files = [
        f
        for f in files
        if f and not f.startswith(".env") and f != "scripts/deploy-vercel-rest.py" and not f.startswith(SKIP_PREFIXES)
    ]
    # Deleted-but-uncommitted files linger in the git index; deploy what
    # actually exists on disk.
    files = [f for f in files if os.path.isfile(f)]
    payloads = []
    for path in files:
        content = open(path, "rb").read()
        payloads.append((path, content, hashlib.sha1(content).hexdigest()))
    # REST uploads have no .git dir on the builder, so hand the built bundle
    # its own identity via .build-sha (read by vite.config.ts). Adding it
    # HERE means the deployment's own SHA is always part of its payload.
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    payloads.append((".build-sha", commit.encode(), hashlib.sha1(commit.encode()).hexdigest()))
    total_bytes = sum(len(p[1]) for p in payloads)
    print(f"{len(payloads)} files, {total_bytes} bytes"
          + (" (DRY RUN — nothing will be sent)" if DRY_RUN else ""))

    # ── Phase 1: upload ─────────────────────────────────────────────────
    uploaded = unchanged = 0
    failed = []
    for i, (path, content, digest) in enumerate(payloads):
        if i % 25 == 0 or i == len(payloads) - 1:
            print(f"[{i + 1}/{len(payloads)}] {path}"
                  + (f"   (uploaded {uploaded}, unchanged {unchanged})" if not DRY_RUN else ""))
        if DRY_RUN:
            uploaded += 1  # every file would be sent; unchanged is unknowable here
            continue
        ok, info = with_retries(lambda p=path, c=content, d=digest: upload_one(p, c, d))
        if not ok:
            failed.append(path)
        elif info == "uploaded":
            uploaded += 1
        else:
            unchanged += 1
    if failed:
        print(f"\nFAILED FILES ({len(failed)}):", failed)
        sys.exit(1)
    if DRY_RUN:
        print("\nDRY RUN complete — no requests were sent to Vercel.")
        print(f"  files in deploy set : {len(payloads)}")
        print(f"  bytes               : {total_bytes:,}")
        print("  uploaded/unchanged split is only knowable during a real send.")
        return

    print(f"\nall files handled — creating deployment (uploaded {uploaded}, unchanged {unchanged})")

    # ── Phase 2: create + poll the deployment ───────────────────────────
    body = json.dumps({
        "name": PROJECT,
        "target": "production",
        "files": [{"sha": sha, "file": path, "size": len(content)} for path, content, sha in payloads],
    }).encode()
    try:
        status, raw = request(
            f"/v13/deployments?teamId={TEAM}&skipAutoDetectionConfirmation=1",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
            timeout=300,
        )
    except urllib.error.HTTPError as e:
        print("DEPLOY FAILED:", e.code, e.read().decode()[:800])
        sys.exit(1)
    dep = json.loads(raw)
    dep_id = dep["id"]
    print(f"deployment created: {dep_id} (HTTP {status})")

    for _ in range(90):
        time.sleep(5)
        _, raw = request(f"/v13/deployments/{dep_id}?teamId={TEAM}")
        d = json.loads(raw)
        state = d.get("readyState")
        print(f"  state: {state}")
        if state == "READY":
            # ── End-of-run summary ────────────────────────────────────────
            print("\n" + "─" * 60)
            print("DEPLOY SUMMARY")
            print(f"  files in deploy set : {len(payloads)}")
            # NB: Vercel returns 200 for BOTH fresh and already-present
            # files (409 is not observed in practice), so this counter
            # means "upload requests sent", not "new bytes transferred".
            print(f"  upload requests sent: {uploaded} (includes files Vercel already had)")
            print(f"  rejected (409)      : {unchanged}")
            print(f"  bytes               : {total_bytes:,}")
            print(f"  deployment          : {dep_id}")
            print(f"  deployment URL      : https://{d.get('url')}")
            print(f"  production alias    : https://{PROJECT}.vercel.app")
            print("─" * 60)
            record_deploy_info(d, uploaded, unchanged, len(payloads), total_bytes)
            return
        if state in ("ERROR", "CANCELED"):
            print("deploy failed:", json.dumps(d.get("builds") or d)[:800])
            sys.exit(1)
    print("timed out waiting for build")
    sys.exit(1)


if __name__ == "__main__":
    main()
