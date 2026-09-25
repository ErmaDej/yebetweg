#!/usr/bin/env python3
"""One-time: upload public/videos/*.mp4 to Supabase Storage (bucket 'videos').

Idempotent (upsert = True). Public CDN URL becomes:
  {SUPABASE_URL}/storage/v1/object/public/videos/{name}
"""
import json
import os
import sys
import urllib.request

# Read config from .env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
def env(name):
    for line in open(".env"):
        line = line.strip()
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip()
    return None

SUPABASE_URL = env("SUPABASE_URL")
KEY = env("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not KEY:
    sys.exit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in .env")

BUCKET = "videos"

def api(path, method="POST", data=None, headers=None):
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        data=data,
        headers={"Authorization": f"Bearer {KEY}", "apikey": KEY, **(headers or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

# 1) Ensure bucket exists (public)
status, body = api(f"/storage/v1/bucket/{BUCKET}", "GET")
if status == 200:
    print(f"bucket '{BUCKET}' exists (public={json.loads(body).get('public')})")
else:
    status, body = api("/storage/v1/bucket", "POST",
                       json.dumps({"id": BUCKET, "name": BUCKET, "public": True}).encode(),
                       {"Content-Type": "application/json"})
    print(f"bucket created: HTTP {status} {body[:120]}")

# 2) Upsert each video
import pathlib
for f in sorted(pathlib.Path("public/videos").glob("*.mp4")):
    content = f.read_bytes()
    status, body = api(
        f"/storage/v1/object/videos/{f.name}",
        "POST",
        content,
        {"Content-Type": "video/mp4", "x-upsert": "true", "cache-control": "31536000,max-age=31536000,immutable"},
    )
    print(f"{f.name}: HTTP {status} {body[:100]} ({len(content)/1e6:.1f} MB)")

print("\nPublic URLs:")
for f in sorted(pathlib.Path("public/videos").glob("*.mp4")):
    print(f"  {SUPABASE_URL}/storage/v1/object/public/videos/{f.name}")
