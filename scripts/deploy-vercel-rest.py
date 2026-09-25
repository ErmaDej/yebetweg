#!/usr/bin/env python3
"""Deploy yebetweg to Vercel production via REST API.

The Vercel CLI's bulk upload kept aborting on this machine's connection, so
this uploads files to /v2/files in small multipart batches with retries
(several small requests survive a flaky network better than one bulk
request), then creates the production deployment referencing the uploaded
SHAs. Vercel builds remotely with the project's configured env vars.
"""
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

# Token comes from the environment so this file can be uploaded to the
# deployment without leaking the credential into Vercel's file store.
TOKEN = os.environ["VERCEL_TOKEN"]
TEAM = "team_LAY5zmGkqFZX0dBHV6AHlCTh"
PROJECT = "yebetweg"
BASE = "https://api.vercel.com"


def request(path, data=None, headers=None, method=None, timeout=180):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Authorization": f"Bearer {TOKEN}", **(headers or {})},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode()


def upload_one(path, content, digest):
    """Per the REST docs, POST /v2/files uploads exactly ONE file per
    request: the body is the raw file content and its sha1 rides in the
    `x-vercel-digest` header. There is no multipart mode (a multipart body
    yields 400 `invalid_digest`). 409 = already uploaded, which is success
    for our purposes."""
    for i in range(3):
        try:
            status, _ = request(
                "/v2/files",
                data=content,
                headers={"Content-Type": "application/octet-stream", "x-vercel-digest": digest},
                method="POST",
                timeout=300,
            )
            return True, None
        except urllib.error.HTTPError as e:
            if e.code == 409:
                return True, None  # already uploaded = fine
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
    payloads = []
    for path in files:
        content = open(path, "rb").read()
        payloads.append((path, content, hashlib.sha1(content).hexdigest()))
    print(f"{len(payloads)} files to upload, {sum(len(p[1]) for p in payloads)} bytes")

    failed = []
    for i, (path, content, digest) in enumerate(payloads):
        if i % 25 == 0 or i == len(payloads) - 1:
            print(f"[{i + 1}/{len(payloads)}] uploading {path}")
        ok, info = with_retries(lambda p=path, c=content, d=digest: upload_one(p, c, d))
        if not ok:
            failed.append(path)
    if failed:
        print("FAILED FILES:", failed)
        sys.exit(1)
    print("all files uploaded — creating deployment")

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
            print(f"\nREADY: {d.get('url')}")
            return
        if state in ("ERROR", "CANCELED"):
            print("deploy failed:", json.dumps(d.get("builds") or d)[:800])
            sys.exit(1)
    print("timed out waiting for build")
    sys.exit(1)


if __name__ == "__main__":
    main()
