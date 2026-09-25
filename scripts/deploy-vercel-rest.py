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
BATCH = 40


def request(path, data=None, headers=None, method=None, timeout=180):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Authorization": f"Bearer {TOKEN}", **(headers or {})},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read().decode()


def multipart(files):
    """files: list of (path, bytes, sha1hex)."""
    boundary = "----verceldeploy7d3f2b"
    out = bytearray()
    for path, content, _sha in files:
        out += f"--{boundary}\r\n".encode()
        out += f'Content-Disposition: form-data; name="{path}"; filename="{path}"\r\n'.encode()
        out += b"Content-Type: application/octet-stream\r\n\r\n"
        out += content
        out += b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def upload_batch(batch):
    body, ctype = multipart(batch)
    try:
        status, _ = request("/v2/files", data=body, headers={"Content-Type": ctype}, method="POST", timeout=300)
        return status in (200, 201), None
    except urllib.error.HTTPError as e:
        if e.code == 409:
            return True, "conflict"  # some file already exists — retry individually
        return False, f"HTTP {e.code}: {e.read().decode()[:200]}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def upload_one(path, content, digest):
    try:
        status, _ = request(
            "/v2/files",
            data=content,
            headers={"Content-Type": "application/octet-stream", "x-vercel-digest": digest},
            method="POST",
            timeout=300,
        )
        return status in (200, 201)
    except urllib.error.HTTPError as e:
        return e.code == 409  # already uploaded = fine
    except Exception:
        return False


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
    files = [
        f
        for f in files
        if f and not f.startswith(".env") and f != "scripts/deploy-vercel-rest.py"
    ]
    payloads = []
    for path in files:
        content = open(path, "rb").read()
        payloads.append((path, content, hashlib.sha1(content).hexdigest()))
    print(f"{len(payloads)} tracked files, {sum(len(p[1]) for p in payloads)} bytes")

    failed = []
    for i in range(0, len(payloads), BATCH):
        batch = payloads[i : i + BATCH]
        names = ", ".join(p[0] for p in batch[:2]) + ("…" if len(batch) > 2 else "")
        print(f"[batch {i // BATCH + 1}/{(len(payloads) + BATCH - 1) // BATCH}] {len(batch)} files: {names}")
        ok, info = with_retries(lambda b=batch: upload_batch(b))
        if ok and info == "conflict":
            # Batch rejected because at least one file exists — fall back to
            # per-file uploads (mostly instant 409s).
            for path, content, digest in batch:
                if not with_retries(lambda p=path, c=content, d=digest: (upload_one(p, c, d), None)):
                    failed.append(path)
        elif not ok:
            failed.extend(p[0] for p in batch)
    if failed:
        print("FAILED FILES:", failed)
        sys.exit(1)
    print("all files uploaded — creating deployment")

    body = json.dumps({
        "name": PROJECT,
        "target": "production",
        "files": [{"sha": sha, "size": len(content)} for _p, content, sha in payloads],
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
